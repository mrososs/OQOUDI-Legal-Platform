-- =====================================================================
-- Identity: profiles, roles, customer accounts, lawyer profiles
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  email text not null,
  phone text check (phone is null or phone ~ '^\+?[0-9]{8,15}$'),
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Security roles. Never derived from client input: signup only grants
-- `customer`; `lawyer`/`admin` are granted by an admin via the server.
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Customer accounts own orders. kind = individual/company (business
-- attribute, not a security role). Members get access to the account's data.
create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  kind public.account_kind not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customer_accounts_touch before update on public.customer_accounts
  for each row execute function private.touch_updated_at();

create table public.customer_account_members (
  account_id uuid not null references public.customer_accounts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index customer_account_members_user_idx on public.customer_account_members (user_id);

create table public.lawyer_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  title text,
  bio text,
  is_active boolean not null default true,
  accepts_consultations boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lawyer_profiles_touch before update on public.lawyer_profiles
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS policies can use them without
-- recursive policy evaluation). `(select auth.uid())` is cached per query.
-- ---------------------------------------------------------------------
create or replace function private.user_has_role(p_user uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r where r.user_id = p_user and r.role = p_role
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_has_role((select auth.uid()), 'admin');
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role in ('lawyer', 'admin')
  );
$$;

create or replace function private.is_account_member(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.customer_account_members m
    where m.account_id = p_account and m.user_id = (select auth.uid())
  );
$$;

grant execute on function private.user_has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.is_account_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Signup bootstrap: profile + customer role + own customer account.
-- Only whitelisted metadata keys are read; anything else is ignored.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(coalesce(nullif(btrim(v_meta ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120);
  v_kind public.account_kind := case when v_meta ->> 'account_type' = 'company' then 'company' else 'individual' end;
  v_company text := left(nullif(btrim(v_meta ->> 'company_name'), ''), 160);
  v_phone text := regexp_replace(coalesce(v_meta ->> 'phone', ''), '[\s-]', '', 'g');
  v_account uuid;
begin
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, full_name, email, phone, preferred_locale)
  values (new.id, v_name, new.email, v_phone, case when v_meta ->> 'locale' = 'en' then 'en' else 'ar' end);

  insert into public.user_roles (user_id, role) values (new.id, 'customer');

  insert into public.customer_accounts (kind, display_name, created_by)
  values (v_kind, case when v_kind = 'company' then coalesce(v_company, v_name) else v_name end, new.id)
  returning id into v_account;

  insert into public.customer_account_members (account_id, user_id, member_role)
  values (v_account, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profiles.email in sync with auth.users.email.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.handle_user_email_change();

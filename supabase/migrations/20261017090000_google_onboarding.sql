-- =====================================================================
-- Google sign-in & smart customer onboarding
--
-- 1. profiles.onboarding_completed_at — database-backed onboarding state.
--    NULL  = the customer still has to complete their profile.
--    The column is NOT part of the `authenticated` column grant on
--    profiles (full_name, phone, preferred_locale), so a browser can never
--    mark itself onboarded; only complete_customer_onboarding() (service
--    role) and private.handle_new_user() write it.
-- 2. private.handle_new_user() — same bootstrap as before; password signups
--    that already carry a name and a valid phone are born onboarded, OAuth
--    signups (Google) are born incomplete.
-- 3. complete_customer_onboarding() — ONE transactional, idempotent write:
--    profile + the customer account that handle_new_user() already created
--    + the completion marker. It never creates a second account.
-- 4. private.orders_require_onboarding() — server-side gate: a customer
--    who has not completed onboarding cannot create an order, whatever the
--    browser does.
--
-- Additive and re-runnable on a populated database: historical users who
-- already have the required data are backfilled as completed.
-- =====================================================================

alter table public.profiles add column onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_completed_at is
  'When the customer completed first-time onboarding (name, Egyptian mobile, account type). NULL = incomplete. Staff (lawyer/admin) are exempt. Written only by SECURITY DEFINER functions.';

-- ---------------------------------------------------------------------
-- Backfill. A historical user is complete when they already hold a phone
-- (the registration form always collected one) or when they are staff.
-- Customers without any phone are genuinely incomplete and will be asked.
-- ---------------------------------------------------------------------
update public.profiles p
set onboarding_completed_at = p.created_at
where p.onboarding_completed_at is null
  and (
    p.phone is not null
    or exists (
      select 1 from public.user_roles r
      where r.user_id = p.id and r.role in ('lawyer', 'admin')
    )
  );

-- ---------------------------------------------------------------------
-- Signup bootstrap (same contract as before + onboarding marker).
-- Roles are still never taken from metadata.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_name text := left(coalesce(nullif(btrim(v_meta ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120);
  v_kind public.account_kind := case when v_meta ->> 'account_type' = 'company' then 'company' else 'individual' end;
  v_company text := left(nullif(btrim(v_meta ->> 'company_name'), ''), 160);
  v_phone text := regexp_replace(coalesce(v_meta ->> 'phone', ''), '[\s-]', '', 'g');
  v_account uuid;
begin
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    v_phone := null;
  end if;

  -- Only an email/password signup that supplied a valid phone is complete
  -- on arrival. Google (or any other OAuth) users always finish onboarding.
  insert into public.profiles (id, full_name, email, phone, preferred_locale, onboarding_completed_at)
  values (
    new.id, v_name, new.email, v_phone,
    case when v_meta ->> 'locale' = 'en' then 'en' else 'ar' end,
    case when v_provider = 'email' and v_phone is not null then now() end
  );

  insert into public.user_roles (user_id, role) values (new.id, 'customer');

  insert into public.customer_accounts (kind, display_name, created_by)
  values (v_kind, case when v_kind = 'company' then coalesce(v_company, v_name) else v_name end, new.id)
  returning id into v_account;

  insert into public.customer_account_members (account_id, user_id, member_role)
  values (v_account, new.id, 'owner');

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Server-side gate on order creation. Fires inside order_create() (and any
-- future insert path) without redefining it. Staff are exempt.
-- ---------------------------------------------------------------------
create or replace function private.orders_require_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
       select 1 from public.profiles p
       where p.id = new.created_by and p.onboarding_completed_at is null
     )
     and not exists (
       select 1 from public.user_roles r
       where r.user_id = new.created_by and r.role in ('lawyer', 'admin')
     )
  then
    perform private.fail('OQ403_ONBOARDING');
  end if;
  return new;
end;
$$;

create trigger orders_require_onboarding
  before insert on public.orders
  for each row execute function private.orders_require_onboarding();

-- ---------------------------------------------------------------------
-- complete_customer_onboarding
--   p_actor           the user id verified from the session JWT by the server
--   p_full_name       3–120 characters
--   p_phone           Egyptian mobile, normalised to +201XXXXXXXXX
--   p_account_kind    individual | company
--   p_company_name    required (2–160) for company, ignored otherwise
--   p_locale          optional 'ar' | 'en' (the UI language at signup)
--
-- Returns { status: completed | already_completed | not_required, ... }.
-- Idempotent: the profile row is locked first, so concurrent submissions
-- serialise and the loser sees `already_completed`. A repeat call never
-- rewrites an onboarded profile (later edits belong to account settings).
-- The whole body is one transaction: if any write fails nothing is marked
-- complete.
-- ---------------------------------------------------------------------
create or replace function public.complete_customer_onboarding(
  p_actor uuid,
  p_full_name text,
  p_phone text,
  p_account_kind public.account_kind,
  p_company_name text default null,
  p_locale text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s-]', '', 'g');
  v_company text := nullif(btrim(coalesce(p_company_name, '')), '');
  v_profile public.profiles;
  v_account public.customer_accounts;
  v_display text;
begin
  if p_actor is null then
    perform private.fail('OQ401');
  end if;

  if char_length(v_name) not between 3 and 120
     or v_phone !~ '^\+201[0125][0-9]{8}$'
     or p_account_kind is null
     or (p_account_kind = 'company' and (v_company is null or char_length(v_company) not between 2 and 160))
  then
    perform private.fail('OQ422_ONBOARDING');
  end if;

  select * into v_profile from public.profiles where id = p_actor for update;
  if not found then
    perform private.fail('OQ404_USER');
  end if;

  -- Staff never go through customer onboarding and are never modified here.
  if exists (
    select 1 from public.user_roles r
    where r.user_id = p_actor and r.role in ('lawyer', 'admin')
  ) then
    return jsonb_build_object('status', 'not_required');
  end if;

  -- The account handle_new_user() created for this user (owner of an account
  -- they created). Never trust ids from the browser; derive from p_actor.
  select a.* into v_account
  from public.customer_accounts a
  join public.customer_account_members m on m.account_id = a.id
  where m.user_id = p_actor and m.member_role = 'owner' and a.created_by = p_actor
  order by a.created_at
  limit 1
  for update of a;

  if v_profile.onboarding_completed_at is not null then
    return jsonb_build_object(
      'status', 'already_completed',
      'accountId', v_account.id,
      'accountKind', v_account.kind,
      'displayName', v_account.display_name
    );
  end if;

  v_display := case when p_account_kind = 'company' then v_company else v_name end;

  if v_account.id is not null then
    -- Existing orders keep the meaning they were placed under.
    if v_account.kind is distinct from p_account_kind
       and exists (select 1 from public.orders o where o.customer_account_id = v_account.id)
    then
      perform private.fail('OQ409_ACCOUNT_KIND_LOCKED');
    end if;

    update public.customer_accounts
    set kind = p_account_kind, display_name = v_display
    where id = v_account.id
    returning * into v_account;
  elsif not exists (select 1 from public.customer_account_members m where m.user_id = p_actor) then
    -- Defensive only: a user with no membership at all. Never a second account.
    insert into public.customer_accounts (kind, display_name, created_by)
    values (p_account_kind, v_display, p_actor)
    returning * into v_account;

    insert into public.customer_account_members (account_id, user_id, member_role)
    values (v_account.id, p_actor, 'owner');
  end if;

  update public.profiles
  set full_name = v_name,
      phone = v_phone,
      preferred_locale = case when p_locale in ('ar', 'en') then p_locale else preferred_locale end,
      onboarding_completed_at = now()
  where id = p_actor;

  perform private.audit(
    p_actor, 'profile.onboarding_completed', 'profile', p_actor::text,
    jsonb_build_object('accountKind', p_account_kind, 'accountId', v_account.id)
  );

  return jsonb_build_object(
    'status', 'completed',
    'accountId', v_account.id,
    'accountKind', v_account.kind,
    'displayName', v_account.display_name
  );
end;
$$;

-- Privilege baseline (tests/integration/privileges.test.ts): server only.
revoke execute on function public.complete_customer_onboarding(uuid, text, text, public.account_kind, text, text) from public, anon, authenticated;
grant execute on function public.complete_customer_onboarding(uuid, text, text, public.account_kind, text, text) to service_role;
revoke execute on function private.orders_require_onboarding() from public, anon, authenticated;

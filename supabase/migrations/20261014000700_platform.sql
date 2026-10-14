-- =====================================================================
-- Platform: reviews, notifications, contact messages, FAQ, content pages,
-- settings, audit log
-- =====================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  is_published boolean not null default true,
  reply text check (reply is null or char_length(reply) <= 2000),
  replied_by uuid references public.profiles (id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_service_idx on public.reviews (service_id, created_at desc) where is_published;

-- In-app notifications. Text is rendered client-side from `type` + `payload`
-- (i18n), so the same row works in Arabic and English.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  order_id uuid references public.orders (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  user_id uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  group_key text not null check (group_key ~ '^[a-z_]+$'),
  group_title jsonb not null check (private.is_localized(group_title)),
  question jsonb not null check (private.is_localized(question)),
  answer jsonb not null check (private.is_localized(answer)),
  sort_order integer not null default 0,
  show_on_home boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faq_entries_touch before update on public.faq_entries
  for each row execute function private.touch_updated_at();

create table public.content_pages (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title jsonb not null check (private.is_localized(title)),
  -- {"paragraphs": [{ar,en}], "values": [{"title": {ar,en}, "text": {ar,en}}]}
  body jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger content_pages_touch before update on public.content_pages
  for each row execute function private.touch_updated_at();

-- Key/value settings. `is_public` rows are readable by everyone
-- (contact details), the rest only by admins / business functions.
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function private.touch_updated_at();

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function private.audit(p_actor uuid, p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

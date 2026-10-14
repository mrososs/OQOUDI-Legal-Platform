-- =====================================================================
-- Service catalog: categories, services, add-ons, page sections,
-- immutable form versions, price history
-- =====================================================================

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title jsonb not null check (private.is_localized(title)),
  description jsonb not null check (private.is_localized(description)),
  icon text not null default 'briefcase' check (icon in ('user', 'building', 'scale', 'briefcase')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger service_categories_touch before update on public.service_categories
  for each row execute function private.touch_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  kind public.service_kind not null default 'standard',
  primary_category_id uuid not null references public.service_categories (id),
  title jsonb not null check (private.is_localized(title)),
  short_description jsonb not null check (private.is_localized(short_description)),
  delivery_estimate jsonb not null check (private.is_localized(delivery_estimate)),
  pricing_type public.pricing_type not null default 'fixed',
  -- For `quote` services this is the "starts from" estimate shown publicly;
  -- the payable amount is set per order when a quote is issued.
  base_price_minor bigint not null check (base_price_minor >= 0 and base_price_minor <= 100000000000),
  currency char(3) not null default 'EGP' check (currency = 'EGP'),
  meeting_duration_minutes integer check (meeting_duration_minutes in (15, 30, 45, 60)),
  status public.publish_status not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  published_form_version_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint services_video_duration check (kind <> 'video_consultation' or meeting_duration_minutes is not null),
  constraint services_quote_estimate check (pricing_type <> 'quote' or base_price_minor > 0),
  constraint services_consultations_fixed check (kind = 'standard' or pricing_type = 'fixed')
);
create index services_status_idx on public.services (status, sort_order);
create index services_category_idx on public.services (primary_category_id);
create trigger services_touch before update on public.services
  for each row execute function private.touch_updated_at();

-- A service can appear in several directories (prototype `cats[]`).
create table public.service_category_links (
  service_id uuid not null references public.services (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  primary key (service_id, category_id)
);
create index service_category_links_category_idx on public.service_category_links (category_id);

create table public.service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  title jsonb not null check (private.is_localized(title)),
  price_minor bigint not null check (price_minor > 0 and price_minor <= 100000000000),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_addons_service_idx on public.service_addons (service_id, sort_order);
create trigger service_addons_touch before update on public.service_addons
  for each row execute function private.touch_updated_at();

-- Page sections. `content` shape depends on `key` and is validated by the
-- shared zod schema on write (shared/domain/serviceSections.ts):
--   about            -> {"ar": "...", "en": "..."}
--   who/included/deliverables/docs/steps -> [{"ar": "...", "en": "..."}, ...]
--   faq              -> [{"q": {...}, "a": {...}}, ...]
--   duration/pricing/reviews -> null (rendered from service data)
create table public.service_sections (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  key public.section_key not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  content jsonb,
  updated_at timestamptz not null default now(),
  unique (service_id, key)
);
create trigger service_sections_touch before update on public.service_sections
  for each row execute function private.touch_updated_at();

-- Immutable form versions (docs/architecture.md D7). `fields` is the ordered
-- field list validated by shared/domain/formSchema.ts.
create table public.service_form_versions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  version integer not null check (version > 0),
  status public.form_version_status not null default 'draft',
  fields jsonb not null check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) <= 60),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (service_id, version)
);
create unique index service_form_versions_one_published
  on public.service_form_versions (service_id) where status = 'published';
create unique index service_form_versions_one_draft
  on public.service_form_versions (service_id) where status = 'draft';

alter table public.services
  add constraint services_published_form_fk
  foreign key (published_form_version_id) references public.service_form_versions (id);

create or replace function private.guard_form_version_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    if new.fields is distinct from old.fields
       or new.version <> old.version
       or new.service_id <> old.service_id then
      perform private.fail('OQ409_FORM_VERSION_IMMUTABLE');
    end if;
    if not (old.status = 'published' and new.status = 'retired') and new.status <> old.status then
      perform private.fail('OQ409_FORM_VERSION_IMMUTABLE');
    end if;
  end if;
  return new;
end;
$$;
create trigger service_form_versions_immutable before update on public.service_form_versions
  for each row execute function private.guard_form_version_immutable();

create or replace function private.guard_form_version_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' then
    perform private.fail('OQ409_FORM_VERSION_IMMUTABLE');
  end if;
  return old;
end;
$$;
create trigger service_form_versions_no_delete before delete on public.service_form_versions
  for each row execute function private.guard_form_version_delete();

-- Price history (written automatically on insert / price change).
create table public.service_price_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  pricing_type public.pricing_type not null,
  base_price_minor bigint not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index service_price_history_service_idx on public.service_price_history (service_id, changed_at desc);

create or replace function private.record_service_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.base_price_minor is distinct from old.base_price_minor
     or new.pricing_type is distinct from old.pricing_type then
    insert into public.service_price_history (service_id, pricing_type, base_price_minor, changed_by)
    values (new.id, new.pricing_type, new.base_price_minor, private.current_actor());
  end if;
  return new;
end;
$$;
create trigger services_price_history after insert or update of base_price_minor, pricing_type on public.services
  for each row execute function private.record_service_price();

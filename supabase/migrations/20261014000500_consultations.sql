-- =====================================================================
-- Video consultation availability and concurrency-safe bookings
-- Canonical timestamps are UTC (timestamptz). Wall-clock rules are in
-- Africa/Cairo and converted by Postgres tzdata (DST-safe).
-- =====================================================================

-- Weekly working hours. lawyer_id NULL = platform consultation calendar.
-- weekday follows extract(dow): 0 = Sunday … 6 = Saturday.
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint availability_rules_range check (end_time > start_time)
);
create index availability_rules_weekday_idx on public.availability_rules (weekday) where is_active;

-- Blocked days (start/end NULL) or blocked time ranges on a Cairo date.
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid references public.profiles (id) on delete cascade,
  exception_date date not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_pair check ((start_time is null) = (end_time is null)),
  constraint availability_exceptions_range check (end_time is null or end_time > start_time)
);
create index availability_exceptions_date_idx on public.availability_exceptions (exception_date);

create table public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  lawyer_id uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'held',
  hold_expires_at timestamptz,
  meeting_provider text not null default 'manual' check (meeting_provider in ('manual')),
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  meeting_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consultation_bookings_range check (ends_at > starts_at),
  -- Two live bookings can never overlap, even under concurrent inserts.
  constraint consultation_bookings_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('held', 'confirmed'))
);
create index consultation_bookings_starts_idx on public.consultation_bookings (starts_at);
create trigger consultation_bookings_touch before update on public.consultation_bookings
  for each row execute function private.touch_updated_at();

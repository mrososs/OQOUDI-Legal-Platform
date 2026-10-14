-- =====================================================================
-- Payments: one row per checkout attempt, provider events (idempotency),
-- refunds. Receipts are numbered on the successful payment row.
-- =====================================================================

create sequence public.receipt_number_seq start with 55822;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('simulator', 'paymob')),
  method public.payment_method not null,
  status public.payment_attempt_status not null default 'initiated',
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'EGP' check (currency = 'EGP'),
  provider_reference text,
  failure_reason text,
  receipt_number text unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  succeeded_at timestamptz,
  failed_at timestamptz,
  unique (provider, provider_reference)
);
create index payments_order_idx on public.payments (order_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at desc);
-- An order can never have two successful payments.
create unique index payments_one_success_per_order on public.payments (order_id) where status = 'succeeded';
create trigger payments_touch before update on public.payments
  for each row execute function private.touch_updated_at();

-- Every provider callback is stored once. The unique key makes webhook
-- processing idempotent: replays are detected and ignored.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payment_id uuid references public.payments (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text,
  unique (provider, provider_event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  status public.refund_status not null default 'requested',
  reason text,
  provider_reference text,
  requested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index refunds_payment_idx on public.refunds (payment_id);

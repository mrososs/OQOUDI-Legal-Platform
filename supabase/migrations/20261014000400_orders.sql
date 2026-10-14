-- =====================================================================
-- Orders, events (status history + timeline), messages, notes,
-- deliveries (versioned), revision requests, written responses, documents
-- =====================================================================

create sequence public.order_number_seq start with 10253;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('DQ-' || nextval('public.order_number_seq')),
  customer_account_id uuid not null references public.customer_accounts (id),
  created_by uuid not null references public.profiles (id),
  service_id uuid not null references public.services (id),
  form_version_id uuid not null references public.service_form_versions (id),
  -- Snapshot of the service at order time: {slug, kind, title{}, pricing_type,
  -- base_price_minor, delivery_estimate{}, meeting_duration_minutes}
  service_snapshot jsonb not null check (jsonb_typeof(service_snapshot) = 'object'),
  status public.order_status not null,
  payment_status public.payment_status not null default 'unpaid',
  base_price_minor bigint not null check (base_price_minor >= 0),
  addons_total_minor bigint not null default 0 check (addons_total_minor >= 0),
  total_minor bigint not null,
  currency char(3) not null default 'EGP' check (currency = 'EGP'),
  quote_issued_at timestamptz,
  -- {fieldId: value}; file fields hold arrays of document ids
  form_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(form_answers) = 'object'),
  assigned_lawyer_id uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint orders_total_consistent check (total_minor = base_price_minor + addons_total_minor)
);
create index orders_account_idx on public.orders (customer_account_id, created_at desc);
create index orders_lawyer_idx on public.orders (assigned_lawyer_id, status);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_service_idx on public.orders (service_id);
create trigger orders_touch before update on public.orders
  for each row execute function private.touch_updated_at();

create table public.order_addons (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  addon_id uuid references public.service_addons (id) on delete set null,
  title jsonb not null check (private.is_localized(title)),
  price_minor bigint not null check (price_minor >= 0)
);
create index order_addons_order_idx on public.order_addons (order_id);

-- Durable history of everything that happens to an order. Status changes
-- carry from/to. `visibility = staff` rows are hidden from customers.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  from_status public.order_status,
  to_status public.order_status,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_kind public.actor_kind not null,
  visibility public.event_visibility not null default 'customer',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_kind public.actor_kind not null check (sender_kind <> 'system'),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index order_messages_order_idx on public.order_messages (order_id, created_at);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);

-- Each delivery is a numbered version; earlier versions are never modified.
create table public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  version integer not null check (version > 0),
  note text check (note is null or char_length(note) <= 2000),
  delivered_by uuid references public.profiles (id) on delete set null,
  delivered_at timestamptz not null default now(),
  unique (order_id, version)
);

create table public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  delivery_id uuid not null references public.order_deliveries (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 5 and 3000),
  created_at timestamptz not null default now()
);
create index revision_requests_order_idx on public.revision_requests (order_id);

create table public.consultation_responses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  version integer not null check (version > 0),
  body text not null check (char_length(btrim(body)) between 20 and 20000),
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (order_id, version)
);

-- Document metadata. Bytes live in Storage (private bucket, random paths).
-- order_id is NULL while a customer attachment is staged before submission.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  kind public.document_kind not null,
  status public.document_status not null default 'pending',
  bucket text not null default 'order-documents',
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 255),
  extension text not null check (extension ~ '^[a-z0-9]{1,8}$'),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  form_field_id text,
  delivery_id uuid references public.order_deliveries (id) on delete restrict,
  response_id uuid references public.consultation_responses (id) on delete restrict,
  message_id uuid references public.order_messages (id) on delete set null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint documents_staging_customer_only check (order_id is not null or kind in ('customer_upload', 'message_attachment'))
);
create index documents_order_idx on public.documents (order_id, kind);
create index documents_uploader_staged_idx on public.documents (uploaded_by) where order_id is null;
create index documents_delivery_idx on public.documents (delivery_id) where delivery_id is not null;

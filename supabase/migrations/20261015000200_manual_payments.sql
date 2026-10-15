-- =====================================================================
-- Manual payment verification (part 2/2)
--
-- Customers pay by InstaPay / Vodafone Cash / PayPal transfer, upload a
-- proof image, and an admin approves or rejects it. Approval is the ONLY
-- path that marks a manual payment succeeded and starts the order.
--
-- Separation of states (see docs/payments/manual-payment-implementation.md):
--   manual_payment_submissions.verification_status  pending_review|approved|rejected
--   payments.status (attempt)                        pending|succeeded|failed|...
--   orders.payment_status / orders.status            unchanged enums
--
-- Historical gateway data (simulator/paymob rows, payment_events, refunds)
-- is kept as is. The gateway entry point payment_start is retired below.
-- =====================================================================

-- ---------------------------------------------------------------------
-- payments: allow the manual provider and flag demo rows
-- ---------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check check (provider in ('simulator', 'paymob', 'manual'));

-- Demo payments must never be reported as real revenue.
alter table public.payments add column if not exists is_demo boolean not null default false;

-- ---------------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------------
create type public.manual_verification_status as enum ('pending_review', 'approved', 'rejected');

create table public.manual_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  customer_account_id uuid not null references public.customer_accounts (id) on delete restrict,
  payment_id uuid not null unique references public.payments (id) on delete restrict,
  payment_method public.payment_method not null
    check (payment_method in ('instapay', 'vodafone_cash', 'paypal')),
  expected_amount_minor bigint not null check (expected_amount_minor > 0),
  currency char(3) not null default 'EGP' check (currency = 'EGP'),
  proof_storage_path text not null unique,
  proof_mime_type text not null check (proof_mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  proof_size_bytes bigint not null check (proof_size_bytes > 0 and proof_size_bytes <= 5242880),
  verification_status public.manual_verification_status not null default 'pending_review',
  demo_mode boolean not null,
  submitted_by uuid not null references public.profiles (id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_payment_review_consistency check (
    (verification_status = 'pending_review' and reviewed_at is null)
    or (verification_status <> 'pending_review' and reviewed_at is not null)
  ),
  constraint manual_payment_reason_only_on_reject check (
    rejection_reason is null or verification_status = 'rejected'
  )
);

-- At most one submission under review, and at most one approval, per order.
create unique index manual_payment_one_pending_per_order
  on public.manual_payment_submissions (order_id) where verification_status = 'pending_review';
create unique index manual_payment_one_approved_per_order
  on public.manual_payment_submissions (order_id) where verification_status = 'approved';
create index manual_payment_status_idx
  on public.manual_payment_submissions (verification_status, submitted_at desc);
create index manual_payment_order_idx
  on public.manual_payment_submissions (order_id, submitted_at desc);

create trigger manual_payment_submissions_touch before update on public.manual_payment_submissions
  for each row execute function private.touch_updated_at();

-- Decisions are immutable: a reviewed submission can never change again,
-- identity columns never change, and nothing is ever deleted.
create or replace function private.manual_submission_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'OQ409_PAYMENT_IMMUTABLE' using errcode = 'P0001';
  end if;
  if old.verification_status <> 'pending_review' then
    -- Only the FK action nulling a deleted reviewer's id is allowed.
    if new.reviewed_by is null and old.reviewed_by is not null
       and (to_jsonb(new) - 'reviewed_by' - 'updated_at') = (to_jsonb(old) - 'reviewed_by' - 'updated_at') then
      return new;
    end if;
    raise exception 'OQ409_PAYMENT_IMMUTABLE' using errcode = 'P0001';
  end if;
  if new.order_id <> old.order_id
     or new.customer_account_id <> old.customer_account_id
     or new.payment_id <> old.payment_id
     or new.payment_method <> old.payment_method
     or new.expected_amount_minor <> old.expected_amount_minor
     or new.proof_storage_path <> old.proof_storage_path
     or new.demo_mode <> old.demo_mode
     or new.submitted_by <> old.submitted_by
     or new.submitted_at <> old.submitted_at then
    raise exception 'OQ409_PAYMENT_IMMUTABLE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger manual_payment_submissions_guard
  before update or delete on public.manual_payment_submissions
  for each row execute function private.manual_submission_guard();

-- Audit trail is append-only. The only permitted update is the FK action
-- that nulls actor_id when a profile is deleted.
create or replace function private.audit_logs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.actor_id is null
     and new.id = old.id
     and new.action = old.action
     and new.entity_type = old.entity_type
     and new.entity_id is not distinct from old.entity_id
     and new.metadata = old.metadata
     and new.created_at = old.created_at then
    return new;
  end if;
  raise exception 'OQ409_AUDIT_IMMUTABLE' using errcode = 'P0001';
end;
$$;

create trigger audit_logs_guard
  before update or delete on public.audit_logs
  for each row execute function private.audit_logs_guard();

-- ---------------------------------------------------------------------
-- RLS: customers read their own account's submissions, admins read all,
-- lawyers read none. No API-role writes (all through functions).
-- ---------------------------------------------------------------------
alter table public.manual_payment_submissions enable row level security;
revoke insert, update, delete, truncate on public.manual_payment_submissions from anon, authenticated;

create policy manual_payment_submissions_select on public.manual_payment_submissions
  for select to authenticated
  using (private.is_admin() or private.is_account_member(customer_account_id));

-- ---------------------------------------------------------------------
-- Private bucket for payment proofs (images only, 5 MB). No storage
-- policies: only the server (service role) signs upload/preview URLs.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Configuration: transfer destinations + resubmission cap. Not public;
-- the server hands destinations only to signed-in customers at checkout.
-- PayPal has no account yet (empty → demo placeholder in demo mode,
-- unavailable in live mode).
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, is_public)
values (
  'payments.manual',
  jsonb_build_object(
    'instapay', jsonb_build_object('destination', '01006816005'),
    'vodafone_cash', jsonb_build_object('destination', '01006816005'),
    'paypal', jsonb_build_object('destination', ''),
    'max_attempts', 3
  ),
  false
)
on conflict (key) do nothing;

create or replace function private.manual_max_attempts()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(1, least(10, coalesce(
    (select (value ->> 'max_attempts')::integer from public.platform_settings where key = 'payments.manual'),
    3
  )));
$$;

-- Hours a consultation slot stays held while a proof waits for review.
create or replace function private.manual_review_hold_until(p_starts_at timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select least(p_starts_at, now() + interval '48 hours');
$$;

-- ---------------------------------------------------------------------
-- Customer: submit a proof
-- ---------------------------------------------------------------------
create or replace function public.manual_payment_submit(
  p_actor uuid,
  p_order uuid,
  p_method public.payment_method,
  p_proof_path text,
  p_proof_mime text,
  p_proof_size bigint,
  p_demo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_booking public.consultation_bookings;
  v_attempts integer;
  v_payment uuid;
  v_submission uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_customer(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  if p_method is null or p_method not in ('instapay', 'vodafone_cash', 'paypal') then
    perform private.fail('OQ422_PAYMENT_METHOD');
  end if;
  if p_demo is null then
    perform private.fail('OQ422_VALIDATION', 'demo flag required');
  end if;
  -- The object path is server-issued: <order>/<actor>/<uuid>.<ext>
  if p_proof_path is null
     or p_proof_path !~ ('^' || p_order::text || '/' || p_actor::text || '/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$')
     or p_proof_mime not in ('image/png', 'image/jpeg', 'image/webp')
     or p_proof_size is null or p_proof_size <= 0 or p_proof_size > 5242880 then
    perform private.fail('OQ422_PROOF_INVALID');
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if v_order.status <> 'awaiting_payment' or v_order.payment_status not in ('unpaid', 'failed') then
    perform private.fail('OQ409_NOT_PAYABLE', v_order.status::text || '/' || v_order.payment_status::text);
  end if;
  if v_order.service_snapshot ->> 'pricingType' = 'quote' and v_order.quote_issued_at is null then
    perform private.fail('OQ409_QUOTE_PENDING');
  end if;
  if v_order.total_minor <= 0 then
    perform private.fail('OQ409_NOT_PAYABLE', 'zero-amount');
  end if;

  if exists (select 1 from public.manual_payment_submissions where order_id = p_order and verification_status = 'pending_review') then
    perform private.fail('OQ409_PAYMENT_PENDING_REVIEW');
  end if;
  select count(*) into v_attempts from public.manual_payment_submissions where order_id = p_order;
  if v_attempts >= private.manual_max_attempts() then
    perform private.fail('OQ409_PAYMENT_ATTEMPTS_EXCEEDED');
  end if;

  -- Video consultations: keep (or re-acquire) the slot while the proof is reviewed.
  select * into v_booking from public.consultation_bookings where order_id = p_order for update;
  if found then
    if v_booking.starts_at <= now() then
      perform private.fail('OQ409_SLOT_UNAVAILABLE');
    elsif v_booking.status = 'held' and v_booking.hold_expires_at > now() then
      update public.consultation_bookings
         set hold_expires_at = private.manual_review_hold_until(v_booking.starts_at)
       where id = v_booking.id;
    elsif v_booking.status in ('held', 'expired') then
      begin
        update public.consultation_bookings
           set status = 'held', hold_expires_at = private.manual_review_hold_until(v_booking.starts_at)
         where id = v_booking.id;
      exception
        when exclusion_violation then
          perform private.fail('OQ409_SLOT_TAKEN');
      end;
    elsif v_booking.status <> 'confirmed' then
      perform private.fail('OQ409_SLOT_TAKEN');
    end if;
  end if;

  -- Leftover gateway attempts can never complete any more.
  update public.payments set status = 'cancelled'
   where order_id = p_order and status in ('initiated', 'pending') and provider <> 'manual';

  insert into public.payments (order_id, provider, method, status, amount_minor, provider_reference, created_by, is_demo)
  values (p_order, 'manual', p_method, 'pending', v_order.total_minor,
          'MP-' || v_order.order_number || '-' || (v_attempts + 1), p_actor, p_demo)
  returning id into v_payment;

  insert into public.manual_payment_submissions (
    order_id, customer_account_id, payment_id, payment_method, expected_amount_minor, currency,
    proof_storage_path, proof_mime_type, proof_size_bytes, demo_mode, submitted_by
  )
  values (
    p_order, v_order.customer_account_id, v_payment, p_method, v_order.total_minor, v_order.currency,
    p_proof_path, p_proof_mime, p_proof_size, p_demo, p_actor
  )
  returning id into v_submission;

  perform private.add_event(p_order, 'payment.proof_submitted', p_actor, 'customer',
    jsonb_build_object('method', p_method, 'amountMinor', v_order.total_minor, 'demo', p_demo));
  perform private.notify_order_customers(p_order, 'payment.proof_submitted',
    jsonb_build_object('amountMinor', v_order.total_minor, 'method', p_method));
  -- No proof path or personal data in the admin payload.
  perform private.notify_admins('payment.review_pending', p_order, private.order_payload(p_order,
    jsonb_build_object('amountMinor', v_order.total_minor, 'method', p_method, 'submissionId', v_submission, 'demo', p_demo)));
  perform private.audit(p_actor, 'manual_payment.submit', 'manual_payment_submission', v_submission::text,
    jsonb_build_object('orderId', p_order, 'paymentId', v_payment, 'method', p_method,
                       'amountMinor', v_order.total_minor, 'demo', p_demo, 'attempt', v_attempts + 1));

  return jsonb_build_object(
    'submissionId', v_submission,
    'paymentId', v_payment,
    'orderNumber', v_order.order_number,
    'amountMinor', v_order.total_minor,
    'status', 'pending_review'
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Admin: shared preconditions for a decision. Locks submission, order
-- and payment rows in a fixed order so two reviewers serialize.
-- ---------------------------------------------------------------------
create or replace function private.manual_lock_for_review(p_actor uuid, p_submission uuid, p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.manual_payment_submissions;
  v_payment public.payments;
begin
  perform private.require_admin(p_actor);
  select * into v_sub from public.manual_payment_submissions where id = p_submission for update;
  if not found then
    perform private.fail('OQ404_PAYMENT');
  end if;
  if v_sub.order_id <> p_order then
    perform private.fail('OQ409_PAYMENT_ORDER_MISMATCH');
  end if;
  if v_sub.verification_status <> 'pending_review' then
    perform private.fail('OQ409_PAYMENT_REVIEWED', v_sub.verification_status::text);
  end if;
  perform 1 from public.orders where id = v_sub.order_id for update;
  select * into v_payment from public.payments where id = v_sub.payment_id for update;
  -- 'cancelled' happens when the customer cancelled the order meanwhile:
  -- the proof can still be rejected (approval re-checks and refuses it).
  if v_payment.provider <> 'manual' or v_payment.status not in ('pending', 'cancelled') then
    perform private.fail('OQ409_PAYMENT_STATE', v_payment.status::text);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Admin: approve → payment succeeded, order paid and started
-- ---------------------------------------------------------------------
create or replace function public.manual_payment_approve(p_actor uuid, p_submission uuid, p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.manual_payment_submissions;
  v_order public.orders;
  v_payment public.payments;
  v_lawyer uuid;
  v_newly_assigned boolean := false;
  v_booking public.consultation_bookings;
  v_receipt text;
  v_to public.order_status;
begin
  perform private.manual_lock_for_review(p_actor, p_submission, p_order);
  select * into v_sub from public.manual_payment_submissions where id = p_submission;
  select * into v_order from public.orders where id = v_sub.order_id;
  select * into v_payment from public.payments where id = v_sub.payment_id;

  if v_order.status <> 'awaiting_payment' or v_order.payment_status not in ('unpaid', 'failed') or v_payment.status <> 'pending' then
    perform private.fail('OQ409_NOT_PAYABLE', v_order.status::text || '/' || v_order.payment_status::text);
  end if;
  if v_payment.amount_minor <> v_sub.expected_amount_minor or v_sub.expected_amount_minor <> v_order.total_minor then
    perform private.audit(p_actor, 'manual_payment.amount_mismatch', 'manual_payment_submission', p_submission::text,
      jsonb_build_object('expected', v_sub.expected_amount_minor, 'payment', v_payment.amount_minor, 'order', v_order.total_minor));
    perform private.fail('OQ409_PAYMENT_AMOUNT_MISMATCH');
  end if;

  update public.manual_payment_submissions
     set verification_status = 'approved', reviewed_at = now(), reviewed_by = p_actor
   where id = p_submission;

  v_receipt := case when v_sub.demo_mode then 'DEMO-RC-' else 'RC-' end || nextval('public.receipt_number_seq');
  update public.payments
     set status = 'succeeded', succeeded_at = now(), failure_reason = null, receipt_number = v_receipt
   where id = v_payment.id;

  update public.orders set payment_status = 'paid', paid_at = now() where id = v_order.id;
  perform private.add_event(v_order.id, 'payment.approved', p_actor, 'admin',
    jsonb_build_object('receiptNumber', v_receipt, 'amountMinor', v_payment.amount_minor,
                       'method', v_payment.method, 'demo', v_sub.demo_mode));

  -- Assignment (same rules as the former gateway path).
  v_lawyer := v_order.assigned_lawyer_id;
  if v_lawyer is null then
    v_lawyer := private.pick_lawyer();
    if v_lawyer is not null then
      v_newly_assigned := true;
      update public.orders set assigned_lawyer_id = v_lawyer where id = v_order.id;
      perform private.add_event(v_order.id, 'order.assigned', null, 'system', jsonb_build_object('lawyerId', v_lawyer), 'staff');
    end if;
  end if;

  select * into v_booking from public.consultation_bookings where order_id = v_order.id for update;
  if found then
    begin
      update public.consultation_bookings
         set status = 'confirmed', hold_expires_at = null, lawyer_id = v_lawyer
       where id = v_booking.id;
      perform private.add_event(v_order.id, 'booking.confirmed', null, 'system', jsonb_build_object('startsAt', v_booking.starts_at));
      perform private.notify_order_customers(v_order.id, 'booking.confirmed', jsonb_build_object('startsAt', v_booking.starts_at));
    exception
      when exclusion_violation then
        perform private.add_event(v_order.id, 'booking.conflict', null, 'system', jsonb_build_object('startsAt', v_booking.starts_at), 'staff');
        perform private.notify_admins('booking.conflict', v_order.id, private.order_payload(v_order.id));
    end;
  end if;

  perform private.notify_order_customers(v_order.id, 'payment.approved',
    jsonb_build_object('amountMinor', v_payment.amount_minor, 'receiptNumber', v_receipt));

  -- Work starts only with a responsible lawyer; otherwise it waits for triage.
  if v_lawyer is not null then
    v_to := 'in_progress';
    perform private.set_order_status(v_order.id, v_to, p_actor, 'admin', jsonb_build_object('reason', 'payment_approved'));
    perform private.notify_order_customers(v_order.id, 'order.started', '{}'::jsonb);
    perform private.notify_user(v_lawyer, 'order.assigned', v_order.id, private.order_payload(v_order.id));
  else
    v_to := 'under_review';
    perform private.set_order_status(v_order.id, v_to, p_actor, 'admin', jsonb_build_object('reason', 'payment_approved'));
    perform private.notify_admins('order.unassigned', v_order.id, private.order_payload(v_order.id));
  end if;

  perform private.audit(p_actor, 'manual_payment.approve', 'manual_payment_submission', p_submission::text,
    jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id, 'amountMinor', v_payment.amount_minor,
                       'receiptNumber', v_receipt, 'demo', v_sub.demo_mode, 'orderStatus', v_to,
                       'lawyerId', v_lawyer, 'newlyAssigned', v_newly_assigned));

  return jsonb_build_object(
    'result', 'approved',
    'orderStatus', v_to,
    'receiptNumber', v_receipt,
    'lawyerAssigned', v_lawyer is not null
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Admin: reject → payment failed, order stays blocked, evidence kept
-- ---------------------------------------------------------------------
create or replace function public.manual_payment_reject(p_actor uuid, p_submission uuid, p_order uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.manual_payment_submissions;
  v_order public.orders;
  v_payment public.payments;
  v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
  v_remaining integer;
begin
  perform private.manual_lock_for_review(p_actor, p_submission, p_order);
  select * into v_sub from public.manual_payment_submissions where id = p_submission;
  select * into v_order from public.orders where id = v_sub.order_id;
  select * into v_payment from public.payments where id = v_sub.payment_id;

  update public.manual_payment_submissions
     set verification_status = 'rejected', reviewed_at = now(), reviewed_by = p_actor, rejection_reason = v_reason
   where id = p_submission;

  update public.payments
     set status = 'failed', failed_at = now(), failure_reason = 'manual_review_rejected'
   where id = v_payment.id and status = 'pending';

  if v_order.payment_status in ('unpaid', 'failed') then
    update public.orders set payment_status = 'failed' where id = v_order.id;
  end if;

  -- Release a slot held for the review.
  update public.consultation_bookings set status = 'expired'
   where order_id = v_order.id and status = 'held';

  perform private.add_event(v_order.id, 'payment.rejected', p_actor, 'admin',
    jsonb_build_object('method', v_payment.method, 'amountMinor', v_payment.amount_minor, 'demo', v_sub.demo_mode));
  perform private.notify_order_customers(v_order.id, 'payment.rejected',
    jsonb_build_object('amountMinor', v_payment.amount_minor));
  perform private.audit(p_actor, 'manual_payment.reject', 'manual_payment_submission', p_submission::text,
    jsonb_build_object('orderId', v_order.id, 'paymentId', v_payment.id, 'amountMinor', v_payment.amount_minor,
                       'demo', v_sub.demo_mode, 'reason', v_reason));

  select private.manual_max_attempts() - count(*) into v_remaining
    from public.manual_payment_submissions where order_id = v_order.id;

  return jsonb_build_object('result', 'rejected', 'remainingAttempts', greatest(v_remaining, 0));
end;
$$;

-- ---------------------------------------------------------------------
-- Retire the gateway entry point: no new card/wallet/Fawry attempts can
-- be started, so nothing can bypass manual verification.
-- payment_record_result stays (service-role only) for historical rows.
-- ---------------------------------------------------------------------
create or replace function public.payment_start(p_actor uuid, p_order uuid, p_method public.payment_method, p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.fail('OQ410_GATEWAY_RETIRED');
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Revenue KPI excludes demo payments.
-- ---------------------------------------------------------------------
create or replace function public.dashboard_kpis()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_admin boolean := private.is_admin();
  v_uid uuid := (select auth.uid());
begin
  if not private.is_staff() then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'newOrders', count(*) filter (where o.status in ('new', 'under_review')),
      'inProgress', count(*) filter (where o.status in ('in_progress', 'revision')),
      'awaitingCustomer', count(*) filter (where o.status in ('awaiting_info', 'delivered', 'awaiting_payment')),
      'completedThisMonth', count(*) filter (where o.status = 'completed' and o.completed_at >= date_trunc('month', now())),
      'revenueThisMonthMinor', case when v_admin then (
        select coalesce(sum(p.amount_minor), 0) from public.payments p
        where p.status = 'succeeded' and not p.is_demo and p.succeeded_at >= date_trunc('month', now())
      ) end
    )
    from public.orders o
    where v_admin or o.assigned_lawyer_id = v_uid
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Privileges (see 20261014001400: every new function gets explicit grants)
-- ---------------------------------------------------------------------
revoke execute on function private.manual_submission_guard() from public, anon, authenticated;
revoke execute on function private.audit_logs_guard() from public, anon, authenticated;
revoke execute on function private.manual_max_attempts() from public, anon, authenticated;
revoke execute on function private.manual_review_hold_until(timestamptz) from public, anon, authenticated;
revoke execute on function private.manual_lock_for_review(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.manual_payment_submit(uuid, uuid, public.payment_method, text, text, bigint, boolean) from public, anon, authenticated;
revoke execute on function public.manual_payment_approve(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.manual_payment_reject(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.payment_start(uuid, uuid, public.payment_method, text) from public, anon, authenticated;
revoke execute on function public.dashboard_kpis() from public, anon;

grant execute on function public.manual_payment_submit(uuid, uuid, public.payment_method, text, text, bigint, boolean) to service_role;
grant execute on function public.manual_payment_approve(uuid, uuid, uuid) to service_role;
grant execute on function public.manual_payment_reject(uuid, uuid, uuid, text) to service_role;
grant execute on function public.payment_start(uuid, uuid, public.payment_method, text) to service_role;
grant execute on function public.dashboard_kpis() to authenticated;

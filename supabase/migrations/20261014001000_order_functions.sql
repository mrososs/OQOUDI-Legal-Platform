-- =====================================================================
-- Order lifecycle business functions.
-- Contract: called by the Nitro server with the service-role key, passing
-- the authenticated user's id as p_actor. Each function re-checks the
-- actor's rights and the transition, then applies all side effects
-- (history, notifications) atomically.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------
create or replace function public.document_register_upload(
  p_actor uuid,
  p_kind public.document_kind,
  p_order uuid,
  p_original_name text,
  p_extension text,
  p_mime_type text,
  p_size_bytes bigint,
  p_form_field_id text,
  p_storage_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status public.order_status;
  v_staged integer;
begin
  perform set_config('oq.actor', p_actor::text, true);

  if p_kind = 'customer_upload' then
    if p_order is not null then
      perform private.fail('OQ422_DOCUMENT_KIND');
    end if;
    if not exists (select 1 from public.customer_account_members where user_id = p_actor) then
      perform private.fail('OQ403');
    end if;
    -- simple abuse guard on staged uploads
    select count(*) into v_staged from public.documents
     where uploaded_by = p_actor and order_id is null and created_at > now() - interval '1 day';
    if v_staged >= 60 then
      perform private.fail('OQ429_TOO_MANY_UPLOADS');
    end if;
  elsif p_kind = 'message_attachment' then
    if p_order is null
       or not (private.actor_is_order_customer(p_actor, p_order) or private.actor_is_order_staff(p_actor, p_order)) then
      perform private.fail('OQ404_ORDER');
    end if;
  else
    -- deliverable / consultation_response: staff on an active order
    if p_order is null or not private.actor_is_order_staff(p_actor, p_order) then
      perform private.fail('OQ404_ORDER');
    end if;
    select status into v_status from public.orders where id = p_order;
    if v_status not in ('under_review', 'in_progress', 'revision', 'awaiting_info') then
      perform private.fail('OQ409_TRANSITION', v_status::text);
    end if;
  end if;

  insert into public.documents (order_id, kind, status, storage_path, original_name, extension, mime_type, size_bytes, form_field_id, uploaded_by)
  values (p_order, p_kind, 'pending', p_storage_path, p_original_name, lower(p_extension), p_mime_type, p_size_bytes, p_form_field_id, p_actor)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.document_mark_ready(p_actor uuid, p_document uuid, p_size_bytes bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documents
     set status = 'ready', ready_at = now(), size_bytes = p_size_bytes
   where id = p_document and uploaded_by = p_actor and status = 'pending';
  if not found then
    perform private.fail('OQ404_DOCUMENT');
  end if;
end;
$$;

-- Attaches the actor's own ready, unattached documents of a given kind.
create or replace function private.attach_documents(
  p_actor uuid,
  p_order uuid,
  p_document_ids uuid[],
  p_kind public.document_kind,
  p_delivery uuid default null,
  p_response uuid default null,
  p_message uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected integer := coalesce(cardinality(array(select distinct unnest(p_document_ids))), 0);
  v_count integer;
begin
  if v_expected = 0 then
    return 0;
  end if;

  update public.documents d
     set order_id = p_order,
         delivery_id = coalesce(p_delivery, d.delivery_id),
         response_id = coalesce(p_response, d.response_id),
         message_id = coalesce(p_message, d.message_id)
   where d.id = any (p_document_ids)
     and d.uploaded_by = p_actor
     and d.status = 'ready'
     and d.kind = p_kind
     and (
       (p_kind in ('customer_upload') and d.order_id is null)
       or (p_kind = 'message_attachment' and (d.order_id is null or d.order_id = p_order) and d.message_id is null)
       or (p_kind = 'deliverable' and d.order_id = p_order and d.delivery_id is null)
       or (p_kind = 'consultation_response' and d.order_id = p_order and d.response_id is null)
     );
  get diagnostics v_count = row_count;

  if v_count <> v_expected then
    perform private.fail('OQ422_DOCUMENT_INVALID');
  end if;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Create order
-- ---------------------------------------------------------------------
create or replace function public.order_create(
  p_actor uuid,
  p_service uuid,
  p_form_version uuid,
  p_answers jsonb,
  p_addon_ids uuid[],
  p_document_ids uuid[],
  p_slot_start timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.services;
  v_account uuid;
  v_order public.orders;
  v_addon_ids uuid[] := coalesce(array(select distinct unnest(p_addon_ids)), '{}');
  v_addons_count integer;
  v_addons_total bigint;
begin
  perform set_config('oq.actor', p_actor::text, true);

  select m.account_id into v_account
  from public.customer_account_members m
  where m.user_id = p_actor
  order by (m.member_role = 'owner') desc, m.created_at
  limit 1;
  if v_account is null then
    perform private.fail('OQ403_NO_ACCOUNT');
  end if;

  select * into v_service from public.services where id = p_service for share;
  if not found or v_service.status <> 'published' then
    perform private.fail('OQ404_SERVICE');
  end if;
  if v_service.published_form_version_id is distinct from p_form_version then
    perform private.fail('OQ409_FORM_OUTDATED');
  end if;

  if v_service.pricing_type = 'quote' and cardinality(v_addon_ids) > 0 then
    perform private.fail('OQ422_ADDON_INVALID');
  end if;
  select count(*), coalesce(sum(a.price_minor), 0) into v_addons_count, v_addons_total
  from public.service_addons a
  where a.id = any (v_addon_ids) and a.service_id = p_service and a.is_active;
  if v_addons_count <> cardinality(v_addon_ids) then
    perform private.fail('OQ422_ADDON_INVALID');
  end if;

  insert into public.orders (
    customer_account_id, created_by, service_id, form_version_id, service_snapshot,
    status, base_price_minor, addons_total_minor, total_minor, form_answers
  )
  values (
    v_account, p_actor, v_service.id, p_form_version,
    jsonb_build_object(
      'slug', v_service.slug,
      'kind', v_service.kind,
      'title', v_service.title,
      'pricingType', v_service.pricing_type,
      'basePriceMinor', v_service.base_price_minor,
      'deliveryEstimate', v_service.delivery_estimate,
      'meetingDurationMinutes', v_service.meeting_duration_minutes
    ),
    case when v_service.pricing_type = 'quote' then 'new' else 'awaiting_payment' end,
    v_service.base_price_minor, v_addons_total, v_service.base_price_minor + v_addons_total,
    coalesce(p_answers, '{}'::jsonb)
  )
  returning * into v_order;

  insert into public.order_addons (order_id, addon_id, title, price_minor)
  select v_order.id, a.id, a.title, a.price_minor
  from public.service_addons a
  where a.id = any (v_addon_ids);

  perform private.attach_documents(p_actor, v_order.id, p_document_ids, 'customer_upload');

  if v_service.kind = 'video_consultation' then
    if p_slot_start is null then
      perform private.fail('OQ422_SLOT_REQUIRED');
    end if;
    perform private.hold_slot(v_order.id, p_slot_start);
  elsif p_slot_start is not null then
    perform private.fail('OQ422_SLOT_NOT_ALLOWED');
  end if;

  perform private.add_event(
    v_order.id, 'order.created', p_actor, 'customer',
    case when p_slot_start is not null then jsonb_build_object('slotStart', p_slot_start) else '{}'::jsonb end,
    'customer', null, v_order.status
  );

  if v_service.pricing_type = 'quote' then
    perform private.notify_admins('order.quote_requested', v_order.id, private.order_payload(v_order.id));
  end if;

  return jsonb_build_object('id', v_order.id, 'orderNumber', v_order.order_number, 'status', v_order.status);
end;
$$;

-- ---------------------------------------------------------------------
-- Messages and notes
-- ---------------------------------------------------------------------
create or replace function public.order_send_message(p_actor uuid, p_order uuid, p_body text, p_document_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_customer boolean := private.actor_is_order_customer(p_actor, p_order);
  v_is_staff boolean := private.actor_is_order_staff(p_actor, p_order);
  v_kind public.actor_kind;
  v_order public.orders;
  v_message uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not (v_is_customer or v_is_staff) then
    perform private.fail('OQ404_ORDER');
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if v_order.status = 'cancelled' then
    perform private.fail('OQ409_TRANSITION', 'cancelled');
  end if;

  v_kind := case when v_is_staff then private.staff_kind(p_actor) else 'customer' end;

  insert into public.order_messages (order_id, sender_id, sender_kind, body)
  values (p_order, p_actor, v_kind, btrim(p_body))
  returning id into v_message;

  perform private.attach_documents(p_actor, p_order, p_document_ids, 'message_attachment', null, null, v_message);

  if v_kind = 'customer' then
    perform private.notify_order_staff(p_order, 'order.message_received', '{}'::jsonb);
    -- Customer reply to an information request returns the order to review.
    if v_order.status = 'awaiting_info' then
      perform private.set_order_status(p_order, 'under_review', p_actor, 'customer', jsonb_build_object('reason', 'info_provided'));
      perform private.notify_order_staff(p_order, 'order.info_provided', '{}'::jsonb);
    end if;
  else
    perform private.notify_order_customers(p_order, 'order.message_received', '{}'::jsonb);
  end if;

  return v_message;
end;
$$;

create or replace function public.order_add_note(p_actor uuid, p_order uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.actor_is_order_staff(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  insert into public.order_notes (order_id, author_id, body) values (p_order, p_actor, btrim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Staff status changes
-- ---------------------------------------------------------------------
-- Generic transitions a lawyer/admin can trigger directly. Deliveries,
-- payments, acceptance, revisions and cancellations have dedicated
-- functions with their own preconditions.
create or replace function public.order_change_status(p_actor uuid, p_order uuid, p_to public.order_status, p_note text default null)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_kind public.actor_kind;
  v_allowed boolean;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_staff(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  v_kind := private.staff_kind(p_actor);
  select * into v_order from public.orders where id = p_order for update;

  v_allowed := case
    when v_order.status = 'under_review' and p_to = 'in_progress' then true
    when v_order.status = 'awaiting_info' and p_to = 'under_review' then true
    when v_order.status = 'revision' and p_to = 'in_progress' then true
    when v_order.status = 'in_progress' and p_to = 'under_review' then true
    -- a video consultation is completed by staff once the meeting took place
    when v_order.status = 'in_progress' and p_to = 'completed'
         and v_order.service_snapshot ->> 'kind' = 'video_consultation' then true
    -- admins can close a delivered order the customer never acted on
    when v_order.status = 'delivered' and p_to = 'completed' and v_kind = 'admin' then true
    else false
  end;
  if not v_allowed then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->' || p_to::text);
  end if;

  perform private.set_order_status(p_order, p_to, p_actor, v_kind,
    case when p_note is not null then jsonb_build_object('note', left(p_note, 500)) else '{}'::jsonb end);

  if p_to = 'completed' then
    update public.consultation_bookings set status = 'completed' where order_id = p_order and status = 'confirmed';
    perform private.notify_order_customers(p_order, 'order.completed', '{}'::jsonb);
  else
    perform private.notify_order_customers(p_order, 'order.status_changed', jsonb_build_object('status', p_to));
  end if;
  return p_to;
end;
$$;

create or replace function public.order_request_info(p_actor uuid, p_order uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_kind public.actor_kind;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_staff(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  v_kind := private.staff_kind(p_actor);
  select * into v_order from public.orders where id = p_order for update;
  if v_order.status not in ('under_review', 'in_progress', 'revision') then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->awaiting_info');
  end if;

  insert into public.order_messages (order_id, sender_id, sender_kind, body)
  values (p_order, p_actor, v_kind, btrim(p_message));
  perform private.set_order_status(p_order, 'awaiting_info', p_actor, v_kind, '{}'::jsonb);
  perform private.notify_order_customers(p_order, 'order.info_requested', '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- Deliveries (versioned) and customer decision
-- ---------------------------------------------------------------------
create or replace function public.order_deliver(p_actor uuid, p_order uuid, p_note text, p_document_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_kind public.actor_kind;
  v_version integer;
  v_delivery uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_staff(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  v_kind := private.staff_kind(p_actor);
  select * into v_order from public.orders where id = p_order for update;
  if v_order.service_snapshot ->> 'kind' <> 'standard' then
    perform private.fail('OQ409_TRANSITION', 'deliver-not-standard');
  end if;
  if v_order.status not in ('under_review', 'in_progress', 'revision') then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->delivered');
  end if;
  if coalesce(cardinality(p_document_ids), 0) = 0 then
    perform private.fail('OQ422_DOCUMENT_REQUIRED');
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.order_deliveries where order_id = p_order;
  insert into public.order_deliveries (order_id, version, note, delivered_by)
  values (p_order, v_version, nullif(btrim(coalesce(p_note, '')), ''), p_actor)
  returning id into v_delivery;

  perform private.attach_documents(p_actor, p_order, p_document_ids, 'deliverable', v_delivery);

  perform private.add_event(p_order, 'delivery.published', p_actor, v_kind, jsonb_build_object('version', v_version));
  perform private.set_order_status(p_order, 'delivered', p_actor, v_kind);
  perform private.notify_order_customers(p_order, 'order.delivered', jsonb_build_object('version', v_version));
  return v_version;
end;
$$;

create or replace function public.order_accept_delivery(p_actor uuid, p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_customer(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if v_order.status <> 'delivered' then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->completed');
  end if;
  perform private.set_order_status(p_order, 'completed', p_actor, 'customer', jsonb_build_object('reason', 'accepted'));
  perform private.notify_order_staff(p_order, 'order.accepted', '{}'::jsonb);
end;
$$;

create or replace function public.order_request_revision(p_actor uuid, p_order uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_delivery uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_customer(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if v_order.status <> 'delivered' then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->revision');
  end if;
  select id into v_delivery from public.order_deliveries where order_id = p_order order by version desc limit 1;
  if v_delivery is null then
    -- written consultation answers are revised via follow-up messages
    perform private.fail('OQ409_TRANSITION', 'no-delivery');
  end if;

  insert into public.revision_requests (order_id, delivery_id, requested_by, reason)
  values (p_order, v_delivery, p_actor, btrim(p_reason));
  insert into public.order_messages (order_id, sender_id, sender_kind, body)
  values (p_order, p_actor, 'customer', btrim(p_reason));
  perform private.set_order_status(p_order, 'revision', p_actor, 'customer', jsonb_build_object('reason', left(btrim(p_reason), 500)));
  perform private.notify_order_staff(p_order, 'order.revision_requested', '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- Written consultation answer
-- ---------------------------------------------------------------------
create or replace function public.order_publish_response(p_actor uuid, p_order uuid, p_body text, p_document_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_kind public.actor_kind;
  v_version integer;
  v_response uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_staff(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  v_kind := private.staff_kind(p_actor);
  select * into v_order from public.orders where id = p_order for update;
  if v_order.service_snapshot ->> 'kind' <> 'written_consultation' then
    perform private.fail('OQ409_TRANSITION', 'response-not-written');
  end if;
  if v_order.status not in ('under_review', 'in_progress', 'revision') then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->delivered');
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.consultation_responses where order_id = p_order;
  insert into public.consultation_responses (order_id, version, body, author_id)
  values (p_order, v_version, btrim(p_body), p_actor)
  returning id into v_response;

  perform private.attach_documents(p_actor, p_order, p_document_ids, 'consultation_response', null, v_response);
  perform private.add_event(p_order, 'response.published', p_actor, v_kind, jsonb_build_object('version', v_version));
  perform private.set_order_status(p_order, 'delivered', p_actor, v_kind);
  perform private.notify_order_customers(p_order, 'order.response_published', '{}'::jsonb);
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------
-- Cancellation
-- Customers may cancel before work starts and before paying. Admins may
-- cancel any non-terminal order; a paid order gets a refund request that
-- the payments module processes (payment_status changes only when the
-- provider confirms the refund).
-- ---------------------------------------------------------------------
create or replace function public.order_cancel(p_actor uuid, p_order uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_kind public.actor_kind;
  v_payment public.payments;
begin
  perform set_config('oq.actor', p_actor::text, true);
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    perform private.fail('OQ404_ORDER');
  end if;

  if private.user_has_role(p_actor, 'admin') then
    v_kind := 'admin';
    if v_order.status in ('completed', 'cancelled') then
      perform private.fail('OQ409_TRANSITION', v_order.status::text || '->cancelled');
    end if;
  elsif private.actor_is_order_customer(p_actor, p_order) then
    v_kind := 'customer';
    if v_order.status not in ('new', 'awaiting_payment') or v_order.payment_status = 'paid' then
      perform private.fail('OQ409_TRANSITION', v_order.status::text || '->cancelled');
    end if;
  else
    perform private.fail('OQ404_ORDER');
  end if;

  update public.orders set cancel_reason = left(nullif(btrim(coalesce(p_reason, '')), ''), 1000) where id = p_order;
  update public.payments set status = 'cancelled' where order_id = p_order and status in ('initiated', 'pending');
  update public.consultation_bookings set status = 'cancelled' where order_id = p_order and status in ('held', 'confirmed', 'expired');
  perform private.set_order_status(p_order, 'cancelled', p_actor, v_kind, jsonb_build_object('reason', left(coalesce(p_reason, ''), 500)));

  if v_order.payment_status = 'paid' then
    select * into v_payment from public.payments where order_id = p_order and status = 'succeeded';
    insert into public.refunds (payment_id, amount_minor, status, reason, requested_by)
    values (v_payment.id, v_payment.amount_minor, 'requested', p_reason, p_actor);
    perform private.add_event(p_order, 'refund.requested', p_actor, v_kind, jsonb_build_object('amountMinor', v_payment.amount_minor));
  end if;

  if v_kind = 'customer' then
    perform private.notify_order_staff(p_order, 'order.cancelled', '{}'::jsonb);
  else
    perform private.notify_order_customers(p_order, 'order.cancelled', '{}'::jsonb);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Quotes and assignment (admin)
-- ---------------------------------------------------------------------
create or replace function public.order_issue_quote(p_actor uuid, p_order uuid, p_amount_minor bigint, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.user_has_role(p_actor, 'admin') then
    perform private.fail('OQ403');
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    perform private.fail('OQ404_ORDER');
  end if;
  if v_order.service_snapshot ->> 'pricingType' <> 'quote' or v_order.status <> 'new' then
    perform private.fail('OQ409_TRANSITION', v_order.status::text || '->awaiting_payment');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    perform private.fail('OQ422_AMOUNT');
  end if;

  update public.orders
     set base_price_minor = p_amount_minor, addons_total_minor = 0, total_minor = p_amount_minor, quote_issued_at = now()
   where id = p_order;
  perform private.add_event(p_order, 'order.quote_issued', p_actor, 'admin',
    jsonb_build_object('amountMinor', p_amount_minor, 'note', left(coalesce(p_note, ''), 500)));
  perform private.set_order_status(p_order, 'awaiting_payment', p_actor, 'admin');
  perform private.notify_order_customers(p_order, 'order.quote_issued', jsonb_build_object('amountMinor', p_amount_minor));
end;
$$;

create or replace function public.order_assign_lawyer(p_actor uuid, p_order uuid, p_lawyer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.user_has_role(p_actor, 'admin') then
    perform private.fail('OQ403');
  end if;
  if not (private.user_has_role(p_lawyer, 'lawyer') and exists (select 1 from public.lawyer_profiles where user_id = p_lawyer and is_active)) then
    perform private.fail('OQ422_LAWYER_INVALID');
  end if;
  select assigned_lawyer_id into v_previous from public.orders where id = p_order for update;
  if not found then
    perform private.fail('OQ404_ORDER');
  end if;
  update public.orders set assigned_lawyer_id = p_lawyer where id = p_order;
  update public.consultation_bookings set lawyer_id = p_lawyer where order_id = p_order;
  perform private.add_event(p_order, 'order.assigned', p_actor, 'admin',
    jsonb_build_object('lawyerId', p_lawyer, 'previousLawyerId', v_previous), 'staff');
  perform private.notify_user(p_lawyer, 'order.assigned', p_order, private.order_payload(p_order));
  perform private.audit(p_actor, 'order.assign', 'order', p_order::text, jsonb_build_object('lawyer', p_lawyer, 'previous', v_previous));
end;
$$;

-- ---------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------
create or replace function public.review_submit(p_actor uuid, p_order uuid, p_rating integer, p_comment text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_name text;
  v_id uuid;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_customer(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  select * into v_order from public.orders where id = p_order;
  if v_order.status <> 'completed' then
    perform private.fail('OQ409_REVIEW_NOT_ELIGIBLE');
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    perform private.fail('OQ422_RATING');
  end if;

  -- Public display name: first name + initial of the second, e.g. «أحمد س.»
  select case
           when a.kind = 'company' then a.display_name
           else split_part(p.full_name, ' ', 1)
                || coalesce(' ' || nullif(left(split_part(p.full_name, ' ', 2), 1), '') || '.', '')
         end
    into v_name
  from public.profiles p
  join public.customer_accounts a on a.id = v_order.customer_account_id
  where p.id = p_actor;

  begin
    insert into public.reviews (order_id, service_id, author_id, display_name, rating, comment)
    values (p_order, v_order.service_id, p_actor, left(coalesce(v_name, '—'), 80), p_rating, nullif(btrim(coalesce(p_comment, '')), ''))
    returning id into v_id;
  exception
    when unique_violation then
      perform private.fail('OQ409_REVIEW_EXISTS');
  end;

  perform private.add_event(p_order, 'review.submitted', p_actor, 'customer', jsonb_build_object('rating', p_rating));
  perform private.notify_order_staff(p_order, 'review.submitted', jsonb_build_object('rating', p_rating));
  return v_id;
end;
$$;

create or replace function public.review_reply(p_actor uuid, p_review uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
begin
  select order_id into v_order from public.reviews where id = p_review;
  if v_order is null or not private.actor_is_order_staff(p_actor, v_order) then
    perform private.fail('OQ404_REVIEW');
  end if;
  update public.reviews
     set reply = nullif(btrim(coalesce(p_reply, '')), ''), replied_by = p_actor, replied_at = now()
   where id = p_review;
end;
$$;

-- ---------------------------------------------------------------------
-- Video consultation: meeting link and rescheduling
-- ---------------------------------------------------------------------
create or replace function public.booking_set_meeting_link(p_actor uuid, p_order uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.consultation_bookings;
  v_order public.orders;
  v_kind public.actor_kind;
  v_url text := btrim(coalesce(p_url, ''));
  v_had_link boolean;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_staff(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  v_kind := private.staff_kind(p_actor);
  if v_url !~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
    perform private.fail('OQ422_MEET_URL');
  end if;
  select * into v_order from public.orders where id = p_order for update;
  select * into v_booking from public.consultation_bookings where order_id = p_order for update;
  if not found or v_booking.status <> 'confirmed' then
    perform private.fail('OQ409_BOOKING_NOT_CONFIRMED');
  end if;
  v_had_link := v_booking.meeting_url is not null;

  update public.consultation_bookings
     set meeting_url = v_url, meeting_published_at = now()
   where id = v_booking.id;

  perform private.add_event(p_order, case when v_had_link then 'meeting.link_updated' else 'meeting.link_published' end, p_actor, v_kind);
  if v_order.status = 'under_review' then
    perform private.set_order_status(p_order, 'in_progress', p_actor, v_kind);
  end if;
  perform private.notify_order_customers(p_order, 'meeting.link_published',
    jsonb_build_object('startsAt', v_booking.starts_at));
end;
$$;

create or replace function public.booking_reschedule(p_actor uuid, p_order uuid, p_new_start timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.consultation_bookings;
  v_is_customer boolean := private.actor_is_order_customer(p_actor, p_order);
  v_is_staff boolean := private.actor_is_order_staff(p_actor, p_order);
  v_kind public.actor_kind;
  v_end timestamptz;
  v_local date := (p_new_start at time zone 'Africa/Cairo')::date;
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not (v_is_customer or v_is_staff) then
    perform private.fail('OQ404_ORDER');
  end if;
  v_kind := case when v_is_staff then private.staff_kind(p_actor) else 'customer' end;

  perform 1 from public.orders where id = p_order for update;
  select * into v_booking from public.consultation_bookings where order_id = p_order for update;
  if not found or v_booking.status <> 'confirmed' then
    perform private.fail('OQ409_BOOKING_NOT_CONFIRMED');
  end if;
  if v_kind = 'customer' and v_booking.starts_at - now() < interval '24 hours' then
    perform private.fail('OQ409_RESCHEDULE_TOO_LATE');
  end if;

  select s.slot_end into v_end from public.available_slots(v_local, v_local) s
  where s.slot_start = p_new_start and s.is_available;
  if v_end is null then
    perform private.fail('OQ409_SLOT_UNAVAILABLE');
  end if;

  begin
    update public.consultation_bookings set starts_at = p_new_start, ends_at = v_end where id = v_booking.id;
  exception
    when exclusion_violation then
      perform private.fail('OQ409_SLOT_TAKEN');
  end;

  perform private.add_event(p_order, 'booking.rescheduled', p_actor, v_kind,
    jsonb_build_object('from', v_booking.starts_at, 'to', p_new_start));
  if v_kind = 'customer' then
    perform private.notify_order_staff(p_order, 'booking.rescheduled', jsonb_build_object('startsAt', p_new_start));
  else
    perform private.notify_order_customers(p_order, 'booking.rescheduled', jsonb_build_object('startsAt', p_new_start));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants: business functions are callable by the server only.
-- ---------------------------------------------------------------------
grant execute on function public.document_register_upload(uuid, public.document_kind, uuid, text, text, text, bigint, text, text) to service_role;
grant execute on function public.document_mark_ready(uuid, uuid, bigint) to service_role;
grant execute on function public.order_create(uuid, uuid, uuid, jsonb, uuid[], uuid[], timestamptz) to service_role;
grant execute on function public.order_send_message(uuid, uuid, text, uuid[]) to service_role;
grant execute on function public.order_add_note(uuid, uuid, text) to service_role;
grant execute on function public.order_change_status(uuid, uuid, public.order_status, text) to service_role;
grant execute on function public.order_request_info(uuid, uuid, text) to service_role;
grant execute on function public.order_deliver(uuid, uuid, text, uuid[]) to service_role;
grant execute on function public.order_accept_delivery(uuid, uuid) to service_role;
grant execute on function public.order_request_revision(uuid, uuid, text) to service_role;
grant execute on function public.order_publish_response(uuid, uuid, text, uuid[]) to service_role;
grant execute on function public.order_cancel(uuid, uuid, text) to service_role;
grant execute on function public.order_issue_quote(uuid, uuid, bigint, text) to service_role;
grant execute on function public.order_assign_lawyer(uuid, uuid, uuid) to service_role;
grant execute on function public.review_submit(uuid, uuid, integer, text) to service_role;
grant execute on function public.review_reply(uuid, uuid, text) to service_role;
grant execute on function public.booking_set_meeting_link(uuid, uuid, text) to service_role;
grant execute on function public.booking_reschedule(uuid, uuid, timestamptz) to service_role;

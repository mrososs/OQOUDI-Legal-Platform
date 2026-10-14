-- Fix: CASE expression produced text for the order_status column.
-- create or replace keeps the existing (service_role-only) EXECUTE grant.
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
    (case when v_service.pricing_type = 'quote' then 'new' else 'awaiting_payment' end)::public.order_status,
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

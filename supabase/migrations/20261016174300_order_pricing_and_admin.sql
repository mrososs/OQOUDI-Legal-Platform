-- =====================================================================
-- Server-side order pricing + admin service editing with launch pricing.
--
-- MERGE NOTE (branch feature/single-admin-mode, migration 20261016093000): that branch no longer
-- redefines `public.order_create`; it notifies admins from an AFTER INSERT trigger on `orders`, so
-- this migration and that one do not conflict and either order of application works. Should any
-- later migration redefine `order_create`, it must keep three small blocks from this version:
--   (1) `v_price := private.price_order(...)` replaces the add-on count/total block,
--   (2) the orders INSERT gains pricing_snapshot / has_vip_delivery / has_bilingual_drafting
--       and uses the priced base/add-on/total,
--   (3) the order_addons INSERT copies the priced rows.
-- tests/integration/launch-campaign.test.ts fails if a later migration drops this.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Pricing of one order at an instant. Never trusts the client: only the
-- service id and the selected add-on ids come from the request.
-- ---------------------------------------------------------------------
create or replace function private.price_order(p_service public.services, p_addon_ids uuid[], p_at timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_launch boolean := private.launch_campaign_active(p_at);
  v_apply boolean := v_launch and p_service.launch_eligible and p_service.launch_price_minor is not null;
  v_ids uuid[] := coalesce(array(select distinct unnest(p_addon_ids)), '{}');
  v_base bigint := private.service_price_minor(p_service, v_launch);
  v_addons jsonb;
  v_addons_total bigint;
  v_state jsonb;
begin
  if p_service.pricing_type = 'quote' and cardinality(v_ids) > 0 then
    perform private.fail('OQ422_ADDON_INVALID');
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', a.id,
             'kind', a.kind,
             'title', a.title,
             'regularMinor', a.price_minor,
             'launchMinor', a.launch_price_minor,
             'appliedMinor', private.addon_price_minor(a, p_service, v_launch),
             'applied', case when v_apply and a.launch_price_minor is not null then 'launch' else 'regular' end
           ) order by a.sort_order, a.id
         ), '[]'::jsonb)
    into v_addons
  from public.service_addons a
  where a.id = any (v_ids) and a.service_id = p_service.id and a.is_active;

  -- every requested add-on must exist for this service, be active and have a price in force
  if jsonb_array_length(v_addons) <> cardinality(v_ids)
     or exists (select 1 from jsonb_array_elements(v_addons) x where x -> 'appliedMinor' = 'null'::jsonb) then
    perform private.fail('OQ422_ADDON_INVALID');
  end if;

  select coalesce(sum((x ->> 'appliedMinor')::bigint), 0) into v_addons_total from jsonb_array_elements(v_addons) x;

  v_state := public.launch_campaign_state();
  return jsonb_build_object(
    'mode', case when v_apply then 'launch' else 'regular' end,
    'currency', 'EGP',
    'baseMinor', v_base,
    'regularBaseMinor', p_service.base_price_minor,
    'launchBaseMinor', p_service.launch_price_minor,
    'discountPercent', case when v_apply and p_service.base_price_minor > 0
      then round(100.0 * (p_service.base_price_minor - p_service.launch_price_minor) / p_service.base_price_minor)::integer end,
    'addons', v_addons,
    'addonsTotalMinor', v_addons_total,
    'totalMinor', v_base + v_addons_total,
    'hasVip', exists (select 1 from jsonb_array_elements(v_addons) x where x ->> 'kind' = 'vip_delivery'),
    'hasBilingual', exists (select 1 from jsonb_array_elements(v_addons) x where x ->> 'kind' = 'bilingual_drafting'),
    'campaign', case when v_apply then jsonb_build_object(
        'status', 'active',
        'startsAt', v_state ->> 'startsAt',
        'endsAt', v_state ->> 'endsAt',
        'durationDays', (v_state ->> 'durationDays')::integer
      ) end,
    'computedAt', p_at
  );
end;
$$;

-- ---------------------------------------------------------------------
-- order_create: unchanged except for the three pricing blocks (see MERGE NOTE).
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
  v_price jsonb;
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

  -- (1) pricing: launch prices only while the campaign is active, decided by the database clock
  v_price := private.price_order(v_service, p_addon_ids, now());

  insert into public.orders (
    customer_account_id, created_by, service_id, form_version_id, service_snapshot,
    status, base_price_minor, addons_total_minor, total_minor, form_answers,
    pricing_snapshot, has_vip_delivery, has_bilingual_drafting
  )
  values (
    v_account, p_actor, v_service.id, p_form_version,
    jsonb_build_object(
      'slug', v_service.slug,
      'kind', v_service.kind,
      'title', v_service.title,
      'pricingType', v_service.pricing_type,
      -- the amount actually charged for the service (launch price while the campaign applied)
      'basePriceMinor', (v_price ->> 'baseMinor')::bigint,
      'regularPriceMinor', v_service.base_price_minor,
      'launchPriceMinor', v_service.launch_price_minor,
      'pricingMode', v_price ->> 'mode',
      'deliveryEstimate', v_service.delivery_estimate,
      'meetingDurationMinutes', v_service.meeting_duration_minutes,
      'expeditedService', (
        select jsonb_build_object('kind', 'vip_delivery', 'title', x -> 'title')
        from jsonb_array_elements(v_price -> 'addons') x
        where x ->> 'kind' = 'vip_delivery'
        limit 1
      )
    ),
    (case when v_service.pricing_type = 'quote' then 'new' else 'awaiting_payment' end)::public.order_status,
    (v_price ->> 'baseMinor')::bigint,
    (v_price ->> 'addonsTotalMinor')::bigint,
    (v_price ->> 'totalMinor')::bigint,
    coalesce(p_answers, '{}'::jsonb),
    v_price,
    (v_price ->> 'hasVip')::boolean,
    (v_price ->> 'hasBilingual')::boolean
  )
  returning * into v_order;

  -- (3) add-on snapshot rows: what was charged, and the prices it was chosen over
  insert into public.order_addons (order_id, addon_id, title, price_minor, kind, regular_price_minor, launch_price_minor, pricing_applied)
  select v_order.id, (x ->> 'id')::uuid, x -> 'title', (x ->> 'appliedMinor')::bigint,
         x ->> 'kind', (x ->> 'regularMinor')::bigint, (x ->> 'launchMinor')::bigint, x ->> 'applied'
  from jsonb_array_elements(v_price -> 'addons') x;

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

  return jsonb_build_object(
    'id', v_order.id, 'orderNumber', v_order.order_number, 'status', v_order.status,
    'totalMinor', v_order.total_minor, 'pricingMode', v_price ->> 'mode'
  );
end;
$$;

-- ---------------------------------------------------------------------
-- admin_save_service: + launch price / eligibility / translation status,
-- add-on kinds and launch prices, and the category's ancestors are linked.
-- p_data additions: launchPriceMinor, launchEligible, translationStatus,
--   addons: [{id?, kind?, title{}, priceMinor|null, launchPriceMinor|null, isActive}]
-- ---------------------------------------------------------------------
create or replace function public.admin_save_service(p_actor uuid, p_service uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_service;
  v_addon jsonb;
  v_keep uuid[] := '{}';
  v_idx integer := 0;
  v_addon_id uuid;
  v_base bigint := (p_data ->> 'basePriceMinor')::bigint;
  v_launch bigint := nullif(p_data ->> 'launchPriceMinor', '')::bigint;
  v_eligible boolean := coalesce((p_data ->> 'launchEligible')::boolean, false);
  v_kinds text[];
begin
  perform private.require_admin(p_actor);

  -- launch pricing rules (the table constraints would also catch these, with an opaque error)
  if v_launch is not null and v_launch > v_base then
    perform private.fail('OQ422_PRICE_INVALID');
  end if;
  if v_eligible and (v_launch is null or p_data ->> 'kind' <> 'standard' or p_data ->> 'pricingType' <> 'fixed') then
    perform private.fail('OQ422_PRICE_INVALID');
  end if;
  -- at most one active add-on per kind
  select coalesce(array_agg(a ->> 'kind'), '{}') into v_kinds
  from jsonb_array_elements(coalesce(p_data -> 'addons', '[]'::jsonb)) a
  where nullif(a ->> 'kind', '') is not null and coalesce((a ->> 'isActive')::boolean, true);
  if cardinality(v_kinds) <> (select count(distinct k) from unnest(v_kinds) k) then
    perform private.fail('OQ422_ADDON_INVALID');
  end if;

  if v_id is null then
    insert into public.services (
      slug, kind, primary_category_id, title, short_description, delivery_estimate,
      pricing_type, base_price_minor, launch_price_minor, launch_eligible, translation_status,
      meeting_duration_minutes, is_featured, sort_order, created_by
    )
    values (
      p_data ->> 'slug',
      (p_data ->> 'kind')::public.service_kind,
      (p_data ->> 'primaryCategoryId')::uuid,
      p_data -> 'title', p_data -> 'shortDescription', p_data -> 'deliveryEstimate',
      (p_data ->> 'pricingType')::public.pricing_type,
      v_base, v_launch, v_eligible, coalesce(nullif(p_data ->> 'translationStatus', ''), 'approved'),
      nullif(p_data ->> 'meetingDurationMinutes', '')::integer,
      coalesce((p_data ->> 'isFeatured')::boolean, false),
      coalesce((p_data ->> 'sortOrder')::integer, 0),
      p_actor
    )
    returning id into v_id;
  else
    update public.services
       set slug = p_data ->> 'slug',
           kind = (p_data ->> 'kind')::public.service_kind,
           primary_category_id = (p_data ->> 'primaryCategoryId')::uuid,
           title = p_data -> 'title',
           short_description = p_data -> 'shortDescription',
           delivery_estimate = p_data -> 'deliveryEstimate',
           pricing_type = (p_data ->> 'pricingType')::public.pricing_type,
           base_price_minor = v_base,
           launch_price_minor = v_launch,
           launch_eligible = v_eligible,
           translation_status = coalesce(nullif(p_data ->> 'translationStatus', ''), translation_status),
           meeting_duration_minutes = nullif(p_data ->> 'meetingDurationMinutes', '')::integer,
           is_featured = coalesce((p_data ->> 'isFeatured')::boolean, false),
           sort_order = coalesce((p_data ->> 'sortOrder')::integer, 0)
     where id = v_id;
    if not found then
      perform private.fail('OQ404_SERVICE');
    end if;
  end if;

  -- categories: chosen ones + the primary + the primary's parent
  delete from public.service_category_links where service_id = v_id;
  insert into public.service_category_links (service_id, category_id)
  select v_id, c::uuid
  from jsonb_array_elements_text(coalesce(p_data -> 'categoryIds', '[]'::jsonb)) c
  union
  select v_id, (p_data ->> 'primaryCategoryId')::uuid
  union
  select v_id, p.parent_id
  from public.service_categories p
  where p.id = (p_data ->> 'primaryCategoryId')::uuid and p.parent_id is not null;

  -- add-ons: update existing, insert new, deactivate removed (kept for history)
  -- retire first so a re-created VIP/bilingual add-on does not collide with its predecessor
  update public.service_addons set is_active = false
   where service_id = v_id
     and id not in (
       select (a ->> 'id')::uuid from jsonb_array_elements(coalesce(p_data -> 'addons', '[]'::jsonb)) a
       where nullif(a ->> 'id', '') is not null
     );
  for v_addon in select * from jsonb_array_elements(coalesce(p_data -> 'addons', '[]'::jsonb))
  loop
    v_idx := v_idx + 1;
    v_addon_id := nullif(v_addon ->> 'id', '')::uuid;
    if v_addon_id is not null then
      update public.service_addons
         set kind = nullif(v_addon ->> 'kind', ''),
             title = v_addon -> 'title',
             price_minor = nullif(v_addon ->> 'priceMinor', '')::bigint,
             launch_price_minor = nullif(v_addon ->> 'launchPriceMinor', '')::bigint,
             is_active = coalesce((v_addon ->> 'isActive')::boolean, true),
             sort_order = v_idx
       where id = v_addon_id and service_id = v_id;
      if not found then
        perform private.fail('OQ422_ADDON_INVALID');
      end if;
    else
      insert into public.service_addons (service_id, kind, title, price_minor, launch_price_minor, is_active, sort_order)
      values (
        v_id, nullif(v_addon ->> 'kind', ''), v_addon -> 'title',
        nullif(v_addon ->> 'priceMinor', '')::bigint, nullif(v_addon ->> 'launchPriceMinor', '')::bigint,
        coalesce((v_addon ->> 'isActive')::boolean, true), v_idx
      )
      returning id into v_addon_id;
    end if;
    v_keep := v_keep || v_addon_id;
  end loop;

  -- sections: full replacement of order/visibility/content
  if p_data ? 'sections' then
    delete from public.service_sections where service_id = v_id;
    insert into public.service_sections (service_id, key, is_enabled, sort_order, content)
    select v_id, (s ->> 'key')::public.section_key, coalesce((s ->> 'isEnabled')::boolean, true), ord::integer, s -> 'content'
    from jsonb_array_elements(p_data -> 'sections') with ordinality as t(s, ord);
  end if;

  perform private.audit(p_actor, case when p_service is null then 'service.create' else 'service.update' end, 'service', v_id::text,
    jsonb_build_object('slug', p_data ->> 'slug'));
  return v_id;
end;
$$;

-- Bulk price update (pricing table). Items may also carry launchPriceMinor / launchEligible.
create or replace function public.admin_update_prices(p_actor uuid, p_prices jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
  v_svc public.services;
  v_base bigint;
  v_launch bigint;
  v_eligible boolean;
  v_type public.pricing_type;
begin
  perform private.require_admin(p_actor);
  for v_item in select * from jsonb_array_elements(p_prices)
  loop
    select * into v_svc from public.services where id = (v_item ->> 'serviceId')::uuid for update;
    if not found then
      continue;
    end if;
    v_type := (v_item ->> 'pricingType')::public.pricing_type;
    v_base := (v_item ->> 'basePriceMinor')::bigint;
    v_launch := case when v_item ? 'launchPriceMinor' then nullif(v_item ->> 'launchPriceMinor', '')::bigint else v_svc.launch_price_minor end;
    v_eligible := case when v_item ? 'launchEligible' then (v_item ->> 'launchEligible')::boolean else v_svc.launch_eligible end;
    if v_launch is not null and v_launch > v_base then
      perform private.fail('OQ422_PRICE_INVALID');
    end if;
    if v_eligible and (v_launch is null or v_type <> 'fixed' or v_svc.kind <> 'standard') then
      perform private.fail('OQ422_PRICE_INVALID');
    end if;
    update public.services
       set pricing_type = v_type,
           base_price_minor = v_base,
           launch_price_minor = v_launch,
           launch_eligible = v_eligible
     where id = v_svc.id;
    v_count := v_count + 1;
  end loop;
  perform private.audit(p_actor, 'service.prices', 'service', null, jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Privileges (see 20261014001400: every new function gets explicit grants).
-- `create or replace` keeps the existing service_role-only grants of the replaced functions.
-- ---------------------------------------------------------------------
revoke execute on function private.price_order(public.services, uuid[], timestamptz) from public, anon, authenticated;

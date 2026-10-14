-- =====================================================================
-- Administration: service editor, form versions, roles, availability.
-- Payload shapes are validated by the server (zod) before reaching here;
-- the database still enforces types, constraints and admin rights.
-- =====================================================================

create or replace function private.require_admin(p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or not private.user_has_role(p_actor, 'admin') then
    perform private.fail('OQ403');
  end if;
  perform set_config('oq.actor', p_actor::text, true);
end;
$$;

-- Upserts service basics, pricing, categories, add-ons and sections in one
-- transaction. p_data:
-- { slug, kind, primaryCategoryId, categoryIds[], title{}, shortDescription{},
--   deliveryEstimate{}, pricingType, basePriceMinor, meetingDurationMinutes,
--   isFeatured, sortOrder,
--   addons: [{id?, title{}, priceMinor, isActive}],
--   sections: [{key, isEnabled, content}] }
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
begin
  perform private.require_admin(p_actor);

  if v_id is null then
    insert into public.services (
      slug, kind, primary_category_id, title, short_description, delivery_estimate,
      pricing_type, base_price_minor, meeting_duration_minutes, is_featured, sort_order, created_by
    )
    values (
      p_data ->> 'slug',
      (p_data ->> 'kind')::public.service_kind,
      (p_data ->> 'primaryCategoryId')::uuid,
      p_data -> 'title', p_data -> 'shortDescription', p_data -> 'deliveryEstimate',
      (p_data ->> 'pricingType')::public.pricing_type,
      (p_data ->> 'basePriceMinor')::bigint,
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
           base_price_minor = (p_data ->> 'basePriceMinor')::bigint,
           meeting_duration_minutes = nullif(p_data ->> 'meetingDurationMinutes', '')::integer,
           is_featured = coalesce((p_data ->> 'isFeatured')::boolean, false),
           sort_order = coalesce((p_data ->> 'sortOrder')::integer, 0)
     where id = v_id;
    if not found then
      perform private.fail('OQ404_SERVICE');
    end if;
  end if;

  -- categories
  delete from public.service_category_links where service_id = v_id;
  insert into public.service_category_links (service_id, category_id)
  select v_id, c::uuid
  from jsonb_array_elements_text(coalesce(p_data -> 'categoryIds', '[]'::jsonb)) c
  union
  select v_id, (p_data ->> 'primaryCategoryId')::uuid;

  -- add-ons: update existing, insert new, deactivate removed (kept for history)
  for v_addon in select * from jsonb_array_elements(coalesce(p_data -> 'addons', '[]'::jsonb))
  loop
    v_idx := v_idx + 1;
    v_addon_id := nullif(v_addon ->> 'id', '')::uuid;
    if v_addon_id is not null then
      update public.service_addons
         set title = v_addon -> 'title',
             price_minor = (v_addon ->> 'priceMinor')::bigint,
             is_active = coalesce((v_addon ->> 'isActive')::boolean, true),
             sort_order = v_idx
       where id = v_addon_id and service_id = v_id;
      if not found then
        perform private.fail('OQ422_ADDON_INVALID');
      end if;
    else
      insert into public.service_addons (service_id, title, price_minor, is_active, sort_order)
      values (v_id, v_addon -> 'title', (v_addon ->> 'priceMinor')::bigint, coalesce((v_addon ->> 'isActive')::boolean, true), v_idx)
      returning id into v_addon_id;
    end if;
    v_keep := v_keep || v_addon_id;
  end loop;
  update public.service_addons set is_active = false where service_id = v_id and not (id = any (v_keep));

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

-- Saves the editable draft form (creating the next version number if needed).
create or replace function public.admin_save_form_draft(p_actor uuid, p_service uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_next integer;
begin
  perform private.require_admin(p_actor);
  if not exists (select 1 from public.services where id = p_service) then
    perform private.fail('OQ404_SERVICE');
  end if;

  update public.service_form_versions
     set fields = p_fields
   where service_id = p_service and status = 'draft'
  returning id into v_id;

  if v_id is null then
    select coalesce(max(version), 0) + 1 into v_next from public.service_form_versions where service_id = p_service;
    insert into public.service_form_versions (service_id, version, status, fields, created_by)
    values (p_service, v_next, 'draft', p_fields, p_actor)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_discard_form_draft(p_actor uuid, p_service uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_actor);
  delete from public.service_form_versions where service_id = p_service and status = 'draft';
end;
$$;

-- Publishes the service. If a draft form exists it becomes the published
-- version (the previous one is retired, never modified).
create or replace function public.admin_publish_service(p_actor uuid, p_service uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.services;
  v_draft public.service_form_versions;
begin
  perform private.require_admin(p_actor);
  select * into v_service from public.services where id = p_service for update;
  if not found then
    perform private.fail('OQ404_SERVICE');
  end if;

  select * into v_draft from public.service_form_versions where service_id = p_service and status = 'draft';
  if found then
    if jsonb_array_length(v_draft.fields) = 0 then
      perform private.fail('OQ422_FORM_EMPTY');
    end if;
    update public.service_form_versions set status = 'retired' where service_id = p_service and status = 'published';
    update public.service_form_versions set status = 'published', published_at = now() where id = v_draft.id;
    update public.services set published_form_version_id = v_draft.id where id = p_service;
    v_service.published_form_version_id := v_draft.id;
  end if;

  if v_service.published_form_version_id is null then
    perform private.fail('OQ422_FORM_EMPTY');
  end if;

  update public.services set status = 'published', published_at = coalesce(published_at, now()) where id = p_service;
  perform private.audit(p_actor, 'service.publish', 'service', p_service::text,
    jsonb_build_object('formVersionId', v_service.published_form_version_id));
  return jsonb_build_object('formVersionId', v_service.published_form_version_id);
end;
$$;

create or replace function public.admin_set_service_status(p_actor uuid, p_service uuid, p_status public.publish_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_actor);
  if p_status = 'published' then
    perform private.fail('OQ422_USE_PUBLISH');
  end if;
  update public.services set status = p_status where id = p_service;
  if not found then
    perform private.fail('OQ404_SERVICE');
  end if;
  perform private.audit(p_actor, 'service.status', 'service', p_service::text, jsonb_build_object('status', p_status));
end;
$$;

-- Bulk price update (pricing table screen). p_prices: [{serviceId, pricingType, basePriceMinor}]
create or replace function public.admin_update_prices(p_actor uuid, p_prices jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  perform private.require_admin(p_actor);
  for v_item in select * from jsonb_array_elements(p_prices)
  loop
    update public.services
       set pricing_type = (v_item ->> 'pricingType')::public.pricing_type,
           base_price_minor = (v_item ->> 'basePriceMinor')::bigint
     where id = (v_item ->> 'serviceId')::uuid;
    v_count := v_count + 1;
  end loop;
  perform private.audit(p_actor, 'service.prices', 'service', null, jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
create or replace function public.admin_set_user_role(p_actor uuid, p_user uuid, p_role public.app_role, p_grant boolean, p_display_name text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_actor);
  if p_role = 'customer' then
    perform private.fail('OQ422_ROLE');
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    perform private.fail('OQ404_USER');
  end if;
  if not p_grant and p_role = 'admin' and p_user = p_actor then
    perform private.fail('OQ409_SELF_DEMOTION');
  end if;

  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, p_actor)
    on conflict (user_id, role) do nothing;
    if p_role = 'lawyer' then
      insert into public.lawyer_profiles (user_id, display_name)
      select p.id, coalesce(nullif(btrim(p_display_name), ''), p.full_name) from public.profiles p where p.id = p_user
      on conflict (user_id) do update set is_active = true;
    end if;
  else
    delete from public.user_roles where user_id = p_user and role = p_role;
    if p_role = 'lawyer' then
      update public.lawyer_profiles set is_active = false where user_id = p_user;
    end if;
  end if;

  perform private.audit(p_actor, case when p_grant then 'role.grant' else 'role.revoke' end, 'user', p_user::text,
    jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------
-- Availability (platform consultation calendar)
-- p_rules: [{weekday, startTime, endTime}] replaces all platform rules.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_availability_rules(p_actor uuid, p_rules jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_actor);
  delete from public.availability_rules where lawyer_id is null;
  insert into public.availability_rules (lawyer_id, weekday, start_time, end_time)
  select null, (r ->> 'weekday')::smallint, (r ->> 'startTime')::time, (r ->> 'endTime')::time
  from jsonb_array_elements(p_rules) r;
  perform private.audit(p_actor, 'availability.rules', 'settings', null, jsonb_build_object('count', jsonb_array_length(p_rules)));
end;
$$;

create or replace function public.admin_add_availability_exception(p_actor uuid, p_date date, p_start time, p_end time, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin(p_actor);
  insert into public.availability_exceptions (lawyer_id, exception_date, start_time, end_time, reason)
  values (null, p_date, p_start, p_end, nullif(btrim(coalesce(p_reason, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_remove_availability_exception(p_actor uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_actor);
  delete from public.availability_exceptions where id = p_id;
end;
$$;

create or replace function public.admin_set_setting(p_actor uuid, p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_actor);
  update public.platform_settings set value = p_value, updated_by = p_actor where key = p_key;
  if not found then
    perform private.fail('OQ404_SETTING');
  end if;
  perform private.audit(p_actor, 'settings.update', 'settings', p_key, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_save_service(uuid, uuid, jsonb) to service_role;
grant execute on function public.admin_save_form_draft(uuid, uuid, jsonb) to service_role;
grant execute on function public.admin_discard_form_draft(uuid, uuid) to service_role;
grant execute on function public.admin_publish_service(uuid, uuid) to service_role;
grant execute on function public.admin_set_service_status(uuid, uuid, public.publish_status) to service_role;
grant execute on function public.admin_update_prices(uuid, jsonb) to service_role;
grant execute on function public.admin_set_user_role(uuid, uuid, public.app_role, boolean, text) to service_role;
grant execute on function public.admin_set_availability_rules(uuid, jsonb) to service_role;
grant execute on function public.admin_add_availability_exception(uuid, date, time, time, text) to service_role;
grant execute on function public.admin_remove_availability_exception(uuid, uuid) to service_role;
grant execute on function public.admin_set_setting(uuid, text, jsonb) to service_role;

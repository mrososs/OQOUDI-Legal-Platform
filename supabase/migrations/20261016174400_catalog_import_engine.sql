-- =====================================================================
-- Catalog import engine (schema + function only — no catalog data here).
--
-- `private.catalog_import(payload)` upserts sub-categories and catalog services
-- idempotently, keyed by `services.source_ref`:
--   created  the record did not exist
--   updated  the record existed (stable id kept) and at least one value changed
--   matched  the record already equals the payload — nothing written
--   failed   (only with p_fail_fast = false) the record was rolled back and reported
--
-- Form versions follow the platform rule: a changed form never edits a published
-- version; the old version is retired and a NEW published version is created, so
-- historical orders keep referencing the version they were placed against.
-- Existing orders, accounts and unrelated services are never touched.
--
-- Every run and every record is logged (catalog_import_runs / catalog_import_items)
-- and shown in the admin "import status" panel.
-- =====================================================================

create table public.catalog_import_runs (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null,
  payload_md5 text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.catalog_import_items (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.catalog_import_runs (id) on delete cascade,
  kind text not null check (kind in ('category', 'service')),
  ref text not null,
  outcome text not null check (outcome in ('created', 'updated', 'matched', 'skipped', 'failed')),
  service_id uuid references public.services (id) on delete set null,
  category_id uuid references public.service_categories (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index catalog_import_items_run_idx on public.catalog_import_items (run_id, kind, ref);

alter table public.catalog_import_runs enable row level security;
alter table public.catalog_import_items enable row level security;
create policy catalog_import_runs_select on public.catalog_import_runs for select to authenticated using (private.is_admin());
create policy catalog_import_items_select on public.catalog_import_items for select to authenticated using (private.is_admin());
revoke all on public.catalog_import_runs, public.catalog_import_items from anon, authenticated;
grant select on public.catalog_import_runs, public.catalog_import_items to authenticated;

create or replace function private.catalog_import_log(
  p_run uuid, p_kind text, p_ref text, p_outcome text, p_service uuid, p_category uuid, p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.catalog_import_items (run_id, kind, ref, outcome, service_id, category_id, details)
  values (p_run, p_kind, p_ref, p_outcome, p_service, p_category, coalesce(p_details, '{}'::jsonb));
$$;

-- payload: {
--   batchKey, categories: [{slug, parentSlug, title{}, description{}, icon, sortOrder}],
--   services: [{ref, sourceRef, slug, reuseSlug?, categorySlug, title{}, shortDescription{}, deliveryEstimate{},
--                basePriceMinor, launchPriceMinor, launchEligible, sortOrder, translationStatus, publish,
--                addons: [{kind, title{}, priceMinor|null, launchPriceMinor|null, sortOrder}],
--                sections: [{key, isEnabled, sortOrder, content}], fields: [...] }] }
create or replace function private.catalog_import(p_payload jsonb, p_fail_fast boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run uuid;
  v_item jsonb;
  v_add jsonb;
  v_parent uuid;
  v_cat public.service_categories;
  v_cat_id uuid;
  v_svc public.services;
  v_pub public.service_form_versions;
  v_addon public.service_addons;
  v_is_new boolean;
  v_reused boolean;
  v_flags text[];
  v_existing jsonb;
  v_wanted jsonb;
  v_new_form uuid;
  v_next integer;
  v_form_version integer;
  v_kinds text[];
begin
  insert into public.catalog_import_runs (batch_key, payload_md5)
  values (coalesce(p_payload ->> 'batchKey', 'unnamed'), md5(p_payload::text))
  returning id into v_run;

  -- -------------------------------------------------------------------
  -- Sub-categories (top-level categories are never created or modified here)
  -- -------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'categories', '[]'::jsonb))
  loop
    begin
      v_parent := null;
      if v_item ->> 'parentSlug' is not null then
        select id into v_parent from public.service_categories where slug = v_item ->> 'parentSlug';
        if v_parent is null then
          raise exception 'parent category "%" does not exist', v_item ->> 'parentSlug';
        end if;
      end if;
      select * into v_cat from public.service_categories where slug = v_item ->> 'slug';
      if v_cat.id is null then
        insert into public.service_categories (slug, parent_id, title, description, icon, sort_order, is_active)
        values (v_item ->> 'slug', v_parent, v_item -> 'title', v_item -> 'description', v_item ->> 'icon', (v_item ->> 'sortOrder')::integer, true)
        returning * into v_cat;
        perform private.catalog_import_log(v_run, 'category', v_cat.slug, 'created', null, v_cat.id, '{}');
      elsif (v_cat.parent_id, v_cat.title, v_cat.description, v_cat.icon, v_cat.sort_order, v_cat.is_active)
            is distinct from (v_parent, v_item -> 'title', v_item -> 'description', v_item ->> 'icon', (v_item ->> 'sortOrder')::integer, true) then
        update public.service_categories
           set parent_id = v_parent, title = v_item -> 'title', description = v_item -> 'description',
               icon = v_item ->> 'icon', sort_order = (v_item ->> 'sortOrder')::integer, is_active = true
         where id = v_cat.id;
        perform private.catalog_import_log(v_run, 'category', v_cat.slug, 'updated', null, v_cat.id, '{}');
      else
        perform private.catalog_import_log(v_run, 'category', v_cat.slug, 'matched', null, v_cat.id, '{}');
      end if;
    exception when others then
      if p_fail_fast then raise; end if;
      perform private.catalog_import_log(v_run, 'category', v_item ->> 'slug', 'failed', null, null, jsonb_build_object('error', sqlerrm));
    end;
  end loop;

  -- -------------------------------------------------------------------
  -- Services
  -- -------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb))
  loop
    begin
      v_flags := '{}';
      v_reused := false;
      v_svc := null;

      select id into v_cat_id from public.service_categories where slug = v_item ->> 'categorySlug';
      if v_cat_id is null then
        raise exception 'category "%" does not exist', v_item ->> 'categorySlug';
      end if;

      select * into v_svc from public.services where source_ref = v_item ->> 'sourceRef';
      if v_svc.id is null and v_item ->> 'reuseSlug' is not null then
        select * into v_svc from public.services where slug = v_item ->> 'reuseSlug';
        if v_svc.id is null then
          raise exception 'service to reuse "%" does not exist', v_item ->> 'reuseSlug';
        end if;
        if v_svc.source_ref is not null and v_svc.source_ref <> v_item ->> 'sourceRef' then
          raise exception 'service "%" is already imported as %', v_svc.slug, v_svc.source_ref;
        end if;
        v_reused := true;
      end if;

      if v_svc.id is null then
        if exists (select 1 from public.services where slug = v_item ->> 'slug') then
          raise exception 'slug "%" belongs to an unrelated service', v_item ->> 'slug';
        end if;
        insert into public.services (
          slug, kind, primary_category_id, title, short_description, delivery_estimate, pricing_type,
          base_price_minor, launch_price_minor, launch_eligible, status, is_featured, sort_order,
          source_ref, translation_status
        )
        values (
          v_item ->> 'slug', 'standard', v_cat_id, v_item -> 'title', v_item -> 'shortDescription', v_item -> 'deliveryEstimate', 'fixed',
          (v_item ->> 'basePriceMinor')::bigint, (v_item ->> 'launchPriceMinor')::bigint, coalesce((v_item ->> 'launchEligible')::boolean, false),
          'draft', false, (v_item ->> 'sortOrder')::integer,
          v_item ->> 'sourceRef', coalesce(v_item ->> 'translationStatus', 'pending_review')
        )
        returning * into v_svc;
        v_is_new := true;
      else
        v_is_new := false;
        if (v_svc.slug, v_svc.primary_category_id, v_svc.title, v_svc.short_description, v_svc.delivery_estimate,
            v_svc.base_price_minor, v_svc.launch_price_minor, v_svc.launch_eligible, v_svc.sort_order, v_svc.source_ref, v_svc.translation_status)
           is distinct from
           (v_item ->> 'slug', v_cat_id, v_item -> 'title', v_item -> 'shortDescription', v_item -> 'deliveryEstimate',
            (v_item ->> 'basePriceMinor')::bigint, (v_item ->> 'launchPriceMinor')::bigint, coalesce((v_item ->> 'launchEligible')::boolean, false),
            (v_item ->> 'sortOrder')::integer, v_item ->> 'sourceRef', coalesce(v_item ->> 'translationStatus', 'pending_review')) then
          update public.services
             set slug = v_item ->> 'slug', primary_category_id = v_cat_id,
                 title = v_item -> 'title', short_description = v_item -> 'shortDescription',
                 delivery_estimate = v_item -> 'deliveryEstimate',
                 base_price_minor = (v_item ->> 'basePriceMinor')::bigint,
                 launch_price_minor = (v_item ->> 'launchPriceMinor')::bigint,
                 launch_eligible = coalesce((v_item ->> 'launchEligible')::boolean, false),
                 sort_order = (v_item ->> 'sortOrder')::integer,
                 source_ref = v_item ->> 'sourceRef',
                 translation_status = coalesce(v_item ->> 'translationStatus', 'pending_review')
           where id = v_svc.id;
          v_flags := array_append(v_flags, 'service');
        end if;
      end if;

      -- add-ons (VIP / bilingual), keyed by kind
      v_kinds := '{}';
      for v_add in select * from jsonb_array_elements(coalesce(v_item -> 'addons', '[]'::jsonb))
      loop
        v_kinds := array_append(v_kinds, v_add ->> 'kind');
        select * into v_addon from public.service_addons
         where service_id = v_svc.id and kind = v_add ->> 'kind' and is_active;
        if v_addon.id is null then
          insert into public.service_addons (service_id, kind, title, price_minor, launch_price_minor, is_active, sort_order)
          values (v_svc.id, v_add ->> 'kind', v_add -> 'title', (v_add ->> 'priceMinor')::bigint, (v_add ->> 'launchPriceMinor')::bigint, true, (v_add ->> 'sortOrder')::integer);
          v_flags := array_append(v_flags, 'addon:' || (v_add ->> 'kind'));
        elsif (v_addon.title, v_addon.price_minor, v_addon.launch_price_minor, v_addon.sort_order)
              is distinct from (v_add -> 'title', (v_add ->> 'priceMinor')::bigint, (v_add ->> 'launchPriceMinor')::bigint, (v_add ->> 'sortOrder')::integer) then
          update public.service_addons
             set title = v_add -> 'title', price_minor = (v_add ->> 'priceMinor')::bigint,
                 launch_price_minor = (v_add ->> 'launchPriceMinor')::bigint, sort_order = (v_add ->> 'sortOrder')::integer
           where id = v_addon.id;
          v_flags := array_append(v_flags, 'addon:' || (v_add ->> 'kind'));
        end if;
      end loop;
      -- a catalog add-on kind that is no longer in the payload is retired (never deleted)
      update public.service_addons set is_active = false
       where service_id = v_svc.id and is_active and kind is not null and not (kind = any (v_kinds));
      if found then
        v_flags := array_append(v_flags, 'addon:retired');
      end if;

      -- sections: compare the whole set, replace when different
      select coalesce(jsonb_agg(jsonb_build_object('key', s.key, 'isEnabled', s.is_enabled, 'sortOrder', s.sort_order, 'content', s.content) order by s.sort_order, s.key), '[]'::jsonb)
        into v_existing from public.service_sections s where s.service_id = v_svc.id;
      select coalesce(jsonb_agg(jsonb_build_object('key', x ->> 'key', 'isEnabled', coalesce((x ->> 'isEnabled')::boolean, true), 'sortOrder', (x ->> 'sortOrder')::integer, 'content', x -> 'content')
                              order by (x ->> 'sortOrder')::integer, x ->> 'key'), '[]'::jsonb)
        into v_wanted from jsonb_array_elements(coalesce(v_item -> 'sections', '[]'::jsonb)) x;
      if v_existing is distinct from v_wanted then
        delete from public.service_sections where service_id = v_svc.id;
        insert into public.service_sections (service_id, key, is_enabled, sort_order, content)
        select v_svc.id, (x ->> 'key')::public.section_key, coalesce((x ->> 'isEnabled')::boolean, true), (x ->> 'sortOrder')::integer, x -> 'content'
        from jsonb_array_elements(coalesce(v_item -> 'sections', '[]'::jsonb)) x;
        v_flags := array_append(v_flags, 'sections');
      end if;

      -- form: published versions are immutable — a different form becomes a NEW version
      select * into v_pub from public.service_form_versions where id = v_svc.published_form_version_id;
      if v_pub.id is not null and v_pub.fields = v_item -> 'fields' then
        v_form_version := v_pub.version;
      else
        delete from public.service_form_versions where service_id = v_svc.id and status = 'draft';
        select coalesce(max(version), 0) + 1 into v_next from public.service_form_versions where service_id = v_svc.id;
        insert into public.service_form_versions (service_id, version, status, fields)
        values (v_svc.id, v_next, 'draft', v_item -> 'fields')
        returning id into v_new_form;
        update public.service_form_versions set status = 'retired' where service_id = v_svc.id and status = 'published';
        update public.service_form_versions set status = 'published', published_at = now() where id = v_new_form;
        update public.services set published_form_version_id = v_new_form where id = v_svc.id;
        v_form_version := v_next;
        v_flags := array_append(v_flags, 'form');
      end if;

      if coalesce((v_item ->> 'publish')::boolean, true) then
        update public.services set status = 'published', published_at = coalesce(published_at, now())
         where id = v_svc.id and status <> 'published';
        if found then
          v_flags := array_append(v_flags, 'status');
        end if;
      end if;

      perform private.catalog_import_log(
        v_run, 'service', v_item ->> 'sourceRef',
        case when v_is_new then 'created' when cardinality(v_flags) > 0 then 'updated' else 'matched' end,
        v_svc.id, null,
        jsonb_build_object('slug', v_item ->> 'slug', 'reusedExisting', v_reused, 'changes', to_jsonb(v_flags), 'formVersion', v_form_version)
      );
    exception when others then
      if p_fail_fast then raise; end if;
      perform private.catalog_import_log(v_run, 'service', v_item ->> 'sourceRef', 'failed', null, null,
        jsonb_build_object('slug', v_item ->> 'slug', 'error', sqlerrm));
    end;
  end loop;

  update public.catalog_import_runs r
     set status = case when exists (select 1 from public.catalog_import_items i where i.run_id = r.id and i.outcome = 'failed') then 'failed' else 'succeeded' end,
         finished_at = now(),
         summary = (
           select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
           from (select kind || '.' || outcome as k, count(*) as n from public.catalog_import_items where run_id = r.id group by 1) t
         )
   where r.id = v_run;

  return (select jsonb_build_object('runId', r.id, 'status', r.status, 'summary', r.summary) from public.catalog_import_runs r where r.id = v_run);
end;
$$;

-- ---------------------------------------------------------------------
-- Privileges (see 20261014001400: every new function gets explicit grants)
-- ---------------------------------------------------------------------
revoke execute on function private.catalog_import_log(uuid, text, text, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.catalog_import(jsonb, boolean) from public, anon, authenticated;

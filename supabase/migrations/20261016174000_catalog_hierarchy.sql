-- =====================================================================
-- Catalog hierarchy (schema only — no catalog data here).
--
-- * service_categories gains `parent_id` (two levels: top-level → sub-category).
--   The three top-level services (individuals, companies, consultations) are unchanged.
-- * A service points `primary_category_id` at its most specific category; a trigger keeps
--   the ancestor linked in service_category_links, so existing top-level filtering
--   (`categoryIds.includes(top.id)`) keeps working and sub-categories filter exactly.
-- * services gains `source_ref` (stable import identifier) and `translation_status`.
-- =====================================================================

alter table public.service_categories
  add column parent_id uuid references public.service_categories (id) on delete restrict;

create index service_categories_parent_idx on public.service_categories (parent_id, sort_order);

-- Wider icon whitelist for sub-categories (rendered by CategoryIcon.vue).
alter table public.service_categories drop constraint service_categories_icon_check;
alter table public.service_categories add constraint service_categories_icon_check check (icon in (
  'user', 'building', 'scale', 'briefcase',
  'home', 'key', 'users', 'trophy', 'handshake', 'car', 'hammer', 'sparkles',
  'landmark', 'book-open', 'package', 'cpu', 'shopping-cart', 'shield', 'megaphone'
));

-- Two levels only; a node cannot be its own parent; a category that has children cannot become a child.
create or replace function private.guard_category_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    perform private.fail('OQ422_CATEGORY_PARENT');
  end if;
  if exists (select 1 from public.service_categories p where p.id = new.parent_id and p.parent_id is not null) then
    perform private.fail('OQ422_CATEGORY_PARENT');
  end if;
  if tg_op = 'UPDATE' and exists (select 1 from public.service_categories c where c.parent_id = new.id) then
    perform private.fail('OQ422_CATEGORY_PARENT');
  end if;
  return new;
end;
$$;
create trigger service_categories_parent_guard before insert or update of parent_id on public.service_categories
  for each row execute function private.guard_category_parent();

-- Stable identifier of an imported catalog entry (e.g. 'catalog-2026-10:IND-001'). NULL for hand-made services.
alter table public.services
  add column source_ref text unique check (source_ref is null or source_ref ~ '^[A-Za-z0-9:_.-]{3,80}$'),
  -- English copy produced by machine translation is flagged until a lawyer approves it.
  add column translation_status text not null default 'approved' check (translation_status in ('approved', 'pending_review'));

-- A service is always linked to its primary category AND that category's parent.
create or replace function private.sync_service_category_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_category_links (service_id, category_id)
  select new.id, c.id
  from public.service_categories c
  where c.id = new.primary_category_id
     or c.id = (select p.parent_id from public.service_categories p where p.id = new.primary_category_id)
  on conflict do nothing;
  return new;
end;
$$;
-- Deferred to commit so that code which inserts the links itself in the same transaction (seed.sql,
-- admin_save_service) is never surprised by a pre-existing row; the function is `on conflict do nothing`.
create constraint trigger services_sync_category_links after insert or update of primary_category_id on public.services
  deferrable initially deferred
  for each row execute function private.sync_service_category_links();

-- ---------------------------------------------------------------------
-- Privileges (see 20261014001400: every new function gets explicit grants)
-- ---------------------------------------------------------------------
revoke execute on function private.guard_category_parent() from public, anon, authenticated;
revoke execute on function private.sync_service_category_links() from public, anon, authenticated;

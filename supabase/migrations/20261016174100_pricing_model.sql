-- =====================================================================
-- Pricing model (schema only — no prices are set here).
--
-- Money stays in integer minor units (piasters).
--
-- services
--   base_price_minor    regular price (unchanged meaning)
--   launch_price_minor  the client-approved launch price, stored explicitly (never derived from a %)
--   launch_eligible     the launch campaign applies to this service (consultations / quote services never)
--
-- service_addons
--   kind                'vip_delivery' | 'bilingual_drafting' | NULL (any other add-on)
--   price_minor         regular price — NULL when the client has not approved a regular price
--                       (the add-on is then only offered while its launch price applies)
--   launch_price_minor  price while the launch campaign is active
--
-- orders / order_addons keep immutable snapshots of what was charged and why.
-- =====================================================================

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
alter table public.services
  add column launch_price_minor bigint
    check (launch_price_minor is null or (launch_price_minor >= 0 and launch_price_minor <= 100000000000)),
  add column launch_eligible boolean not null default false,
  add constraint services_launch_not_above_base check (launch_price_minor is null or launch_price_minor <= base_price_minor),
  add constraint services_launch_standard_fixed_only check (not launch_eligible or (kind = 'standard' and pricing_type = 'fixed')),
  add constraint services_launch_eligible_needs_price check (not launch_eligible or launch_price_minor is not null);

-- ---------------------------------------------------------------------
-- service_addons
-- ---------------------------------------------------------------------
alter table public.service_addons drop constraint service_addons_price_minor_check;
alter table public.service_addons alter column price_minor drop not null;
alter table public.service_addons
  add column kind text check (kind in ('vip_delivery', 'bilingual_drafting')),
  add column launch_price_minor bigint
    check (launch_price_minor is null or (launch_price_minor > 0 and launch_price_minor <= 100000000000)),
  add constraint service_addons_price_check check (price_minor is null or (price_minor > 0 and price_minor <= 100000000000)),
  add constraint service_addons_has_a_price check (price_minor is not null or launch_price_minor is not null);

-- At most one ACTIVE VIP and one ACTIVE bilingual add-on per service (retired ones are kept for history).
create unique index service_addons_kind_unique on public.service_addons (service_id, kind) where kind is not null and is_active;

-- ---------------------------------------------------------------------
-- Order snapshots (historical orders keep their defaults: nothing is rewritten)
-- ---------------------------------------------------------------------
alter table public.orders
  add column pricing_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(pricing_snapshot) = 'object'),
  add column has_vip_delivery boolean not null default false,
  add column has_bilingual_drafting boolean not null default false;

create index orders_vip_idx on public.orders (created_at desc) where has_vip_delivery;

alter table public.order_addons
  add column kind text,
  add column regular_price_minor bigint,
  add column launch_price_minor bigint,
  add column pricing_applied text check (pricing_applied in ('regular', 'launch'));

-- ---------------------------------------------------------------------
-- Price history: also record launch price and eligibility changes
-- ---------------------------------------------------------------------
alter table public.service_price_history
  add column launch_price_minor bigint,
  add column launch_eligible boolean;

create or replace function private.record_service_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.base_price_minor is distinct from old.base_price_minor
     or new.pricing_type is distinct from old.pricing_type
     or new.launch_price_minor is distinct from old.launch_price_minor
     or new.launch_eligible is distinct from old.launch_eligible then
    insert into public.service_price_history (service_id, pricing_type, base_price_minor, launch_price_minor, launch_eligible, changed_by)
    values (new.id, new.pricing_type, new.base_price_minor, new.launch_price_minor, new.launch_eligible, private.current_actor());
  end if;
  return new;
end;
$$;

drop trigger services_price_history on public.services;
create trigger services_price_history after insert or update of base_price_minor, pricing_type, launch_price_minor, launch_eligible on public.services
  for each row execute function private.record_service_price();

-- ---------------------------------------------------------------------
-- Effective prices. `p_launch` = the launch campaign is active right now.
-- Mirrors shared/domain/pricing.ts (a unit + integration test keeps them equal).
-- ---------------------------------------------------------------------
create or replace function private.service_price_minor(p_service public.services, p_launch boolean)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_launch and p_service.launch_eligible and p_service.launch_price_minor is not null
      then p_service.launch_price_minor
    else p_service.base_price_minor
  end;
$$;

-- NULL = the add-on has no price in force and must not be offered / accepted.
create or replace function private.addon_price_minor(p_addon public.service_addons, p_service public.services, p_launch boolean)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_launch and p_service.launch_eligible and p_addon.launch_price_minor is not null
      then p_addon.launch_price_minor
    else p_addon.price_minor
  end;
$$;

-- ---------------------------------------------------------------------
-- Privileges (see 20261014001400: every new function gets explicit grants)
-- ---------------------------------------------------------------------
revoke execute on function private.record_service_price() from public, anon, authenticated;
revoke execute on function private.service_price_minor(public.services, boolean) from public, anon, authenticated;
revoke execute on function private.addon_price_minor(public.service_addons, public.services, boolean) from public, anon, authenticated;

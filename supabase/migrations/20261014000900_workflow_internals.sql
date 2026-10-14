-- =====================================================================
-- Internal helpers for business functions: actor checks, events,
-- notifications, status changes, lawyer assignment, slot generation
-- =====================================================================

create or replace function private.actor_is_order_customer(p_actor uuid, p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.customer_account_members m on m.account_id = o.customer_account_id
    where o.id = p_order and m.user_id = p_actor
  );
$$;

create or replace function private.actor_is_order_staff(p_actor uuid, p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_has_role(p_actor, 'admin')
      or exists (
        select 1 from public.orders o
        where o.id = p_order
          and o.assigned_lawyer_id = p_actor
          and private.user_has_role(p_actor, 'lawyer')
      );
$$;

create or replace function private.staff_kind(p_actor uuid)
returns public.actor_kind
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.user_has_role(p_actor, 'admin') then 'admin'::public.actor_kind else 'lawyer'::public.actor_kind end;
$$;

-- Standard notification payload for an order.
create or replace function private.order_payload(p_order uuid, p_extra jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'orderNumber', o.order_number,
           'serviceTitle', o.service_snapshot -> 'title',
           'serviceKind', o.service_snapshot ->> 'kind'
         ) || coalesce(p_extra, '{}'::jsonb)
  from public.orders o
  where o.id = p_order;
$$;

create or replace function private.add_event(
  p_order uuid,
  p_type text,
  p_actor uuid,
  p_actor_kind public.actor_kind,
  p_details jsonb default '{}'::jsonb,
  p_visibility public.event_visibility default 'customer',
  p_from public.order_status default null,
  p_to public.order_status default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.order_events (order_id, type, from_status, to_status, actor_id, actor_kind, visibility, details)
  values (p_order, p_type, p_from, p_to, p_actor, p_actor_kind, p_visibility, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function private.notify_user(p_user uuid, p_type text, p_order uuid, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, order_id, payload)
  select p_user, p_type, p_order, coalesce(p_payload, '{}'::jsonb)
  where p_user is not null;
$$;

create or replace function private.notify_order_customers(p_order uuid, p_type text, p_extra jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, order_id, payload)
  select m.user_id, p_type, p_order, private.order_payload(p_order, p_extra)
  from public.orders o
  join public.customer_account_members m on m.account_id = o.customer_account_id
  where o.id = p_order;
$$;

create or replace function private.notify_admins(p_type text, p_order uuid, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, order_id, payload)
  select r.user_id, p_type, p_order, coalesce(p_payload, '{}'::jsonb)
  from public.user_roles r
  where r.role = 'admin';
$$;

-- Assigned lawyer, or every admin when nobody is assigned yet.
create or replace function private.notify_order_staff(p_order uuid, p_type text, p_extra jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lawyer uuid;
begin
  select assigned_lawyer_id into v_lawyer from public.orders where id = p_order;
  if v_lawyer is not null then
    perform private.notify_user(v_lawyer, p_type, p_order, private.order_payload(p_order, p_extra));
  else
    perform private.notify_admins(p_type, p_order, private.order_payload(p_order, p_extra));
  end if;
end;
$$;

-- Applies a status change with its timestamps and history row.
create or replace function private.set_order_status(
  p_order uuid,
  p_to public.order_status,
  p_actor uuid,
  p_actor_kind public.actor_kind,
  p_details jsonb default '{}'::jsonb
)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.order_status;
begin
  select status into v_from from public.orders where id = p_order;
  if v_from = p_to then
    return v_from;
  end if;

  update public.orders
     set status = p_to,
         delivered_at = case when p_to = 'delivered' then now() else delivered_at end,
         completed_at = case when p_to = 'completed' then now() else completed_at end,
         cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end
   where id = p_order;

  perform private.add_event(p_order, 'order.status_changed', p_actor, p_actor_kind, p_details, 'customer', v_from, p_to);
  return v_from;
end;
$$;

-- Default lawyer from settings, otherwise the active lawyer with the
-- fewest open orders.
create or replace function private.pick_lawyer()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select lp.user_id
      from public.platform_settings ps
      join public.lawyer_profiles lp on lp.user_id = (ps.value ->> 'lawyer_id')::uuid and lp.is_active
      join public.user_roles r on r.user_id = lp.user_id and r.role = 'lawyer'
      where ps.key = 'assignment.default_lawyer'
    ),
    (
      select lp.user_id
      from public.lawyer_profiles lp
      join public.user_roles r on r.user_id = lp.user_id and r.role = 'lawyer'
      where lp.is_active
      order by (
        select count(*) from public.orders o
        where o.assigned_lawyer_id = lp.user_id and o.status not in ('completed', 'cancelled')
      ), lp.created_at
      limit 1
    )
  );
$$;

create or replace function private.booking_setting(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value ->> p_key)::integer from public.platform_settings where key = 'booking'), p_default);
$$;

-- ---------------------------------------------------------------------
-- Slot generation (public: returns times only, no customer data)
-- ---------------------------------------------------------------------
create or replace function public.available_slots(p_from date, p_to date)
returns table (slot_start timestamptz, slot_end timestamptz, is_available boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select private.booking_setting('slot_minutes', 30) as dur,
           private.booking_setting('lead_minutes', 120) as lead_min,
           private.booking_setting('horizon_days', 60) as horizon
  ),
  days as (
    select d::date as day
    from generate_series(
      greatest(p_from, (now() at time zone 'Africa/Cairo')::date),
      least(p_to, p_from + 62),
      interval '1 day'
    ) d
  ),
  raw as (
    select gs as local_start, cfg.dur, cfg.lead_min, cfg.horizon
    from days
    cross join cfg
    join public.availability_rules r
      on r.lawyer_id is null and r.is_active and r.weekday = extract(dow from days.day)
    cross join lateral generate_series(
      days.day + r.start_time,
      days.day + r.end_time - make_interval(mins => cfg.dur),
      make_interval(mins => cfg.dur)
    ) gs
    where not exists (
      select 1 from public.availability_exceptions e
      where e.lawyer_id is null and e.exception_date = days.day and e.start_time is null
    )
  )
  select
    raw.local_start at time zone 'Africa/Cairo',
    (raw.local_start + make_interval(mins => raw.dur)) at time zone 'Africa/Cairo',
    (
      (raw.local_start at time zone 'Africa/Cairo') >= now() + make_interval(mins => raw.lead_min)
      and (raw.local_start at time zone 'Africa/Cairo') <= now() + make_interval(days => raw.horizon)
      and not exists (
        select 1 from public.availability_exceptions e
        where e.lawyer_id is null
          and e.exception_date = raw.local_start::date
          and e.start_time is not null
          and tsrange(raw.local_start::date + e.start_time, raw.local_start::date + e.end_time)
              && tsrange(raw.local_start, raw.local_start + make_interval(mins => raw.dur))
      )
      and not exists (
        select 1 from public.consultation_bookings b
        where (b.status = 'confirmed' or (b.status = 'held' and b.hold_expires_at > now()))
          and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(
                raw.local_start at time zone 'Africa/Cairo',
                (raw.local_start + make_interval(mins => raw.dur)) at time zone 'Africa/Cairo', '[)')
      )
    )
  from raw
  order by 1;
$$;
grant execute on function public.available_slots(date, date) to anon, authenticated, service_role;

-- Places (or re-places) a hold for an order's booking. Stale holds that
-- overlap are expired first; the exclusion constraint resolves races.
create or replace function private.hold_slot(p_order uuid, p_start timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end timestamptz;
  v_local date := (p_start at time zone 'Africa/Cairo')::date;
  v_hold integer := private.booking_setting('hold_minutes', 15);
begin
  select s.slot_end into v_end
  from public.available_slots(v_local, v_local) s
  where s.slot_start = p_start and s.is_available;

  if v_end is null then
    perform private.fail('OQ409_SLOT_UNAVAILABLE');
  end if;

  update public.consultation_bookings
     set status = 'expired'
   where status = 'held'
     and hold_expires_at <= now()
     and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_start, v_end, '[)');

  begin
    insert into public.consultation_bookings (order_id, starts_at, ends_at, status, hold_expires_at)
    values (p_order, p_start, v_end, 'held', now() + make_interval(mins => v_hold))
    on conflict (order_id) do update
      set starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          status = 'held',
          hold_expires_at = excluded.hold_expires_at;
  exception
    when exclusion_violation then
      perform private.fail('OQ409_SLOT_TAKEN');
  end;
end;
$$;

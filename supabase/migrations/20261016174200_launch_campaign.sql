-- =====================================================================
-- Launch campaign ("خصم الإطلاق 50% لمدة 15 يوم").
--
-- One setting row, `pricing.launch_campaign`, seeded DISABLED with no date:
-- nothing is active on deployment. It only becomes active when an admin
-- enables it with an explicit activation date (Africa/Cairo local date).
--
--   status = disabled  → not enabled, or no window configured
--            scheduled → enabled, now < startsAt
--            active    → startsAt <= now < endsAt
--            expired   → now >= endsAt
--
-- The window is exactly 15 calendar days in Cairo time: endsAt is the
-- start's Cairo local timestamp + 15 days, converted back to an instant
-- (so a DST change inside the window does not shorten or stretch it).
-- Everything is evaluated against the DATABASE clock.
-- =====================================================================

insert into public.platform_settings (key, value, is_public)
values (
  'pricing.launch_campaign',
  jsonb_build_object(
    'enabled', false,
    'durationDays', 15,
    'timezone', 'Africa/Cairo',
    'startDate', null,
    'startTime', '00:00',
    'startsAt', null,
    'endsAt', null
  ),
  false  -- read through the server (service role); not exposed to the browser directly
)
on conflict (key) do nothing;

-- Shape guard: whatever writes this row (admin function, SQL console), it must stay coherent.
create or replace function private.campaign_setting_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.key <> 'pricing.launch_campaign' then
    return new;
  end if;
  if jsonb_typeof(new.value) <> 'object' or jsonb_typeof(new.value -> 'enabled') <> 'boolean' then
    raise exception 'OQ422_CAMPAIGN_SETTING' using errcode = 'P0001';
  end if;
  if (new.value ->> 'enabled')::boolean then
    if new.value ->> 'startsAt' is null or new.value ->> 'endsAt' is null
       or (new.value ->> 'endsAt')::timestamptz <= (new.value ->> 'startsAt')::timestamptz then
      raise exception 'OQ422_CAMPAIGN_SETTING' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger platform_settings_campaign_guard before insert or update on public.platform_settings
  for each row execute function private.campaign_setting_guard();

create or replace function private.launch_campaign_status(p_at timestamptz default now())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when coalesce((s.value ->> 'enabled')::boolean, false) is not true
        or s.value ->> 'startsAt' is null
        or s.value ->> 'endsAt' is null then 'disabled'
      when p_at < (s.value ->> 'startsAt')::timestamptz then 'scheduled'
      when p_at < (s.value ->> 'endsAt')::timestamptz then 'active'
      else 'expired'
    end
    from public.platform_settings s
    where s.key = 'pricing.launch_campaign'
  ), 'disabled');
$$;

create or replace function private.launch_campaign_active(p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.launch_campaign_status(p_at) = 'active';
$$;

-- Full campaign state for the trusted server (public endpoint / admin dashboard).
create or replace function public.launch_campaign_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', private.launch_campaign_status(now()),
    'enabled', coalesce((s.value ->> 'enabled')::boolean, false),
    'durationDays', coalesce((s.value ->> 'durationDays')::integer, 15),
    'timezone', 'Africa/Cairo',
    'startDate', s.value ->> 'startDate',
    'startTime', coalesce(s.value ->> 'startTime', '00:00'),
    'startsAt', s.value ->> 'startsAt',
    'endsAt', s.value ->> 'endsAt',
    'serverNow', now()
  )
  from (select value from public.platform_settings where key = 'pricing.launch_campaign') s;
$$;

-- Enable (with an explicit Cairo activation date) or disable the campaign. Admin only; audited.
create or replace function public.admin_set_launch_campaign(
  p_actor uuid,
  p_enabled boolean,
  p_start_date date,
  p_start_time time default '00:00'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_days constant integer := 15;
  c_zone constant text := 'Africa/Cairo';
  v_old jsonb;
  v_status text;
  v_local timestamp;
  v_starts timestamptz;
  v_ends timestamptz;
  v_value jsonb;
begin
  perform private.require_admin(p_actor);

  select value into v_old from public.platform_settings where key = 'pricing.launch_campaign' for update;
  v_status := private.launch_campaign_status(now());

  if p_enabled then
    if p_start_date is null then
      perform private.fail('OQ422_CAMPAIGN_DATE');
    end if;
    if p_start_date < (now() at time zone c_zone)::date then
      perform private.fail('OQ422_CAMPAIGN_DATE');
    end if;
    v_local := p_start_date + coalesce(p_start_time, time '00:00');
    v_starts := v_local at time zone c_zone;
    v_ends := (v_local + make_interval(days => c_days)) at time zone c_zone;
    -- The window cannot be moved while customers are being charged launch prices.
    if v_status = 'active' and (v_old ->> 'startsAt')::timestamptz is distinct from v_starts then
      perform private.fail('OQ409_CAMPAIGN_ACTIVE');
    end if;
    v_value := jsonb_build_object(
      'enabled', true,
      'durationDays', c_days,
      'timezone', c_zone,
      'startDate', p_start_date,
      'startTime', to_char(coalesce(p_start_time, time '00:00'), 'HH24:MI'),
      'startsAt', v_starts,
      'endsAt', v_ends
    );
  else
    -- Disabling keeps the last configured window for reference and ends the campaign immediately.
    v_value := coalesce(v_old, '{}'::jsonb) || jsonb_build_object('enabled', false);
  end if;

  insert into public.platform_settings (key, value, is_public, updated_by)
  values ('pricing.launch_campaign', v_value, false, p_actor)
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by;

  perform private.audit(p_actor, 'campaign.updated', 'settings', 'pricing.launch_campaign',
    jsonb_build_object('from', v_old, 'to', v_value, 'statusBefore', v_status));

  return public.launch_campaign_state();
end;
$$;

-- ---------------------------------------------------------------------
-- Privileges (see 20261014001400: every new function gets explicit grants)
-- ---------------------------------------------------------------------
revoke execute on function private.campaign_setting_guard() from public, anon, authenticated;
revoke execute on function private.launch_campaign_status(timestamptz) from public, anon, authenticated;
revoke execute on function private.launch_campaign_active(timestamptz) from public, anon, authenticated;
revoke execute on function public.launch_campaign_state() from public, anon, authenticated;
revoke execute on function public.admin_set_launch_campaign(uuid, boolean, date, time) from public, anon, authenticated;

grant execute on function public.launch_campaign_state() to service_role;
grant execute on function public.admin_set_launch_campaign(uuid, boolean, date, time) to service_role;

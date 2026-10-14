-- =====================================================================
-- Function privilege lockdown.
-- Supabase grants EXECUTE on new functions to anon/authenticated through
-- default ACLs owned by platform roles, which `alter default privileges`
-- in our migrations does not override. Revoke explicitly, then re-grant
-- only what API roles legitimately need.
--
-- RULE FOR FUTURE MIGRATIONS: every new function must be followed by an
-- explicit revoke/grant (tests/integration/privileges.test.ts enforces it).
-- =====================================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end;
$$;

-- Public read helpers
grant execute on function public.available_slots(date, date) to anon, authenticated;
grant execute on function public.service_ratings() to anon, authenticated;
grant execute on function public.dashboard_kpis() to authenticated;

-- Helpers referenced by RLS policies / CHECK constraints
grant execute on function private.is_localized(jsonb) to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.user_has_role(uuid, public.app_role) to authenticated;
grant execute on function private.is_account_member(uuid) to authenticated;
grant execute on function private.can_read_order(uuid) to authenticated;
grant execute on function private.is_order_staff(uuid) to authenticated;
grant execute on function private.is_order_customer(uuid) to authenticated;
grant execute on function private.lawyer_handles_account(uuid) to authenticated;
grant execute on function private.lawyer_handles_user(uuid) to authenticated;
grant execute on function private.current_actor() to authenticated;
-- used inside available_slots (security definer runs as owner, but keep explicit)
grant execute on function private.booking_setting(text, integer) to anon, authenticated;

-- Trigger functions run as the table owner; no API grants needed.

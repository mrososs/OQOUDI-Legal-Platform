-- =====================================================================
-- Admin catalog support (schema only).
-- A lightweight view for the services list: form version + number of inputs, without
-- shipping every form's JSON to the browser. security_invoker: the caller's RLS applies
-- (staff see all versions; the public never reaches this view).
-- =====================================================================

create view public.service_form_stats
with (security_invoker = true) as
select
  v.id,
  v.service_id,
  v.version,
  v.status,
  (select count(*) from jsonb_array_elements(v.fields) f where f ->> 'type' not in ('section', 'help'))::integer as input_count
from public.service_form_versions v;

revoke all on public.service_form_stats from public, anon, authenticated;
grant select on public.service_form_stats to authenticated;

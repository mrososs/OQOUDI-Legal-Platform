-- =====================================================================
-- Storage bucket and read helpers
-- =====================================================================

-- Private bucket for all legal documents. Deliberately NO storage.objects
-- policies for anon/authenticated: only the service role (server) can
-- create signed upload/download URLs after checking access in SQL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-documents',
  'order-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public rating aggregates (published reviews only).
create or replace function public.service_ratings()
returns table (service_id uuid, avg_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.service_id, round(avg(r.rating)::numeric, 1), count(*)
  from public.reviews r
  join public.services s on s.id = r.service_id and s.status = 'published'
  where r.is_published
  group by r.service_id;
$$;
grant execute on function public.service_ratings() to anon, authenticated, service_role;

-- Staff dashboard counters. Lawyers get their own queue; admins get the
-- platform plus revenue. Returns NULL revenue for non-admins.
create or replace function public.dashboard_kpis()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_admin boolean := private.is_admin();
  v_uid uuid := (select auth.uid());
begin
  if not private.is_staff() then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'newOrders', count(*) filter (where o.status in ('new', 'under_review')),
      'inProgress', count(*) filter (where o.status in ('in_progress', 'revision')),
      'awaitingCustomer', count(*) filter (where o.status in ('awaiting_info', 'delivered', 'awaiting_payment')),
      'completedThisMonth', count(*) filter (where o.status = 'completed' and o.completed_at >= date_trunc('month', now())),
      'revenueThisMonthMinor', case when v_admin then (
        select coalesce(sum(p.amount_minor), 0) from public.payments p
        where p.status = 'succeeded' and p.succeeded_at >= date_trunc('month', now())
      ) end
    )
    from public.orders o
    where v_admin or o.assigned_lawyer_id = v_uid
  );
end;
$$;
grant execute on function public.dashboard_kpis() to authenticated;

-- =====================================================================
-- Row Level Security
-- Reads: policies below. Writes: none for API roles on workflow tables —
-- all mutations go through SECURITY DEFINER business functions executed
-- by the server (service_role). Two narrow exceptions use column grants:
--   profiles(full_name, phone, preferred_locale) and notifications(read_at).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Order access helpers
-- ---------------------------------------------------------------------
create or replace function private.can_read_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order
      and (
        o.assigned_lawyer_id = (select auth.uid())
        or exists (
          select 1 from public.customer_account_members m
          where m.account_id = o.customer_account_id and m.user_id = (select auth.uid())
        )
        or private.user_has_role((select auth.uid()), 'admin')
      )
  );
$$;

create or replace function private.is_order_staff(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order
      and (
        (o.assigned_lawyer_id = (select auth.uid()) and private.user_has_role((select auth.uid()), 'lawyer'))
        or private.user_has_role((select auth.uid()), 'admin')
      )
  );
$$;

create or replace function private.is_order_customer(p_order uuid)
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
    where o.id = p_order and m.user_id = (select auth.uid())
  );
$$;

-- Lawyers may see the profile/account of customers whose orders they handle.
create or replace function private.lawyer_handles_account(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.customer_account_id = p_account and o.assigned_lawyer_id = (select auth.uid())
  );
$$;

create or replace function private.lawyer_handles_user(p_user uuid)
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
    where m.user_id = p_user and o.assigned_lawyer_id = (select auth.uid())
  );
$$;

grant execute on function private.can_read_order(uuid) to authenticated, service_role;
grant execute on function private.is_order_staff(uuid) to authenticated, service_role;
grant execute on function private.is_order_customer(uuid) to authenticated, service_role;
grant execute on function private.lawyer_handles_account(uuid) to authenticated, service_role;
grant execute on function private.lawyer_handles_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Baseline privileges: no direct writes from API roles
-- ---------------------------------------------------------------------
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke usage, select on all sequences in schema public from anon, authenticated;

grant update (full_name, phone, preferred_locale) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customer_accounts enable row level security;
alter table public.customer_account_members enable row level security;
alter table public.lawyer_profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_category_links enable row level security;
alter table public.service_addons enable row level security;
alter table public.service_sections enable row level security;
alter table public.service_form_versions enable row level security;
alter table public.service_price_history enable row level security;
alter table public.orders enable row level security;
alter table public.order_addons enable row level security;
alter table public.order_events enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_notes enable row level security;
alter table public.order_deliveries enable row level security;
alter table public.revision_requests enable row level security;
alter table public.consultation_responses enable row level security;
alter table public.documents enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.consultation_bookings enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.faq_entries enable row level security;
alter table public.content_pages enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_admin()
    or private.lawyer_handles_user(id)
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy customer_accounts_select on public.customer_accounts for select to authenticated
  using (
    private.is_account_member(id)
    or private.is_admin()
    or private.lawyer_handles_account(id)
  );

create policy customer_account_members_select on public.customer_account_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- Lawyer display names are shown to customers on their orders.
create policy lawyer_profiles_select on public.lawyer_profiles for select to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- Catalog (public read of published content; staff read everything)
-- ---------------------------------------------------------------------
create policy service_categories_select on public.service_categories for select to anon, authenticated
  using (is_active or private.is_staff());

create policy services_select on public.services for select to anon, authenticated
  using (status = 'published' or private.is_staff());

create policy service_category_links_select on public.service_category_links for select to anon, authenticated
  using (exists (select 1 from public.services s where s.id = service_id));

create policy service_addons_select on public.service_addons for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.services s where s.id = service_id and s.status = 'published'))
    or private.is_staff()
  );

create policy service_sections_select on public.service_sections for select to anon, authenticated
  using (
    (is_enabled and exists (select 1 from public.services s where s.id = service_id and s.status = 'published'))
    or private.is_staff()
  );

create policy service_form_versions_select on public.service_form_versions for select to anon, authenticated
  using (
    (status = 'published' and exists (select 1 from public.services s where s.id = service_id and s.status = 'published'))
    or private.is_staff()
    -- customers need the exact (possibly retired) version their order used
    or exists (
      select 1 from public.orders o
      where o.form_version_id = service_form_versions.id
        and private.is_account_member(o.customer_account_id)
    )
  );

create policy service_price_history_select on public.service_price_history for select to authenticated
  using (private.is_admin());

-- ---------------------------------------------------------------------
-- Orders and children
-- ---------------------------------------------------------------------
create policy orders_select on public.orders for select to authenticated
  using (
    assigned_lawyer_id = (select auth.uid())
    or private.is_account_member(customer_account_id)
    or private.is_admin()
  );

create policy order_addons_select on public.order_addons for select to authenticated
  using (private.can_read_order(order_id));

create policy order_events_select on public.order_events for select to authenticated
  using (
    private.can_read_order(order_id)
    and (visibility = 'customer' or private.is_order_staff(order_id))
  );

create policy order_messages_select on public.order_messages for select to authenticated
  using (private.can_read_order(order_id));

create policy order_notes_select on public.order_notes for select to authenticated
  using (private.is_order_staff(order_id));

create policy order_deliveries_select on public.order_deliveries for select to authenticated
  using (private.can_read_order(order_id));

create policy revision_requests_select on public.revision_requests for select to authenticated
  using (private.can_read_order(order_id));

create policy consultation_responses_select on public.consultation_responses for select to authenticated
  using (private.can_read_order(order_id));

create policy documents_select on public.documents for select to authenticated
  using (
    -- own uploads (including staged, not yet attached)
    uploaded_by = (select auth.uid())
    -- staff on the order see everything attached to it
    or (order_id is not null and private.is_order_staff(order_id))
    -- customers see their uploads and only *published* deliverables/answers
    or (
      order_id is not null
      and status = 'ready'
      and private.is_order_customer(order_id)
      and (
        kind in ('customer_upload', 'message_attachment')
        or (kind = 'deliverable' and delivery_id is not null)
        or (kind = 'consultation_response' and response_id is not null)
      )
    )
  );

-- ---------------------------------------------------------------------
-- Consultations
-- ---------------------------------------------------------------------
create policy availability_rules_select on public.availability_rules for select to authenticated
  using (private.is_staff());
create policy availability_exceptions_select on public.availability_exceptions for select to authenticated
  using (private.is_staff());
create policy consultation_bookings_select on public.consultation_bookings for select to authenticated
  using (private.can_read_order(order_id));

-- ---------------------------------------------------------------------
-- Payments (customers: own orders; lawyers: none; admins: all)
-- ---------------------------------------------------------------------
create policy payments_select on public.payments for select to authenticated
  using (private.is_admin() or private.is_order_customer(order_id));

create policy payment_events_select on public.payment_events for select to authenticated
  using (private.is_admin());

create policy refunds_select on public.refunds for select to authenticated
  using (
    private.is_admin()
    or exists (select 1 from public.payments p where p.id = payment_id and private.is_order_customer(p.order_id))
  );

-- ---------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------
create policy reviews_select on public.reviews for select to anon, authenticated
  using (is_published or author_id = (select auth.uid()) or private.is_admin() or private.is_order_staff(order_id));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy contact_messages_select on public.contact_messages for select to authenticated
  using (private.is_admin());

create policy faq_entries_select on public.faq_entries for select to anon, authenticated
  using (is_published or private.is_admin());

create policy content_pages_select on public.content_pages for select to anon, authenticated
  using (is_published or private.is_admin());

create policy platform_settings_select on public.platform_settings for select to anon, authenticated
  using (is_public or private.is_admin());

create policy audit_logs_select on public.audit_logs for select to authenticated
  using (private.is_admin());

-- ---------------------------------------------------------------------
-- Realtime (RLS applies to change events)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.order_messages;

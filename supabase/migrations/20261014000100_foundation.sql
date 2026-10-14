-- =====================================================================
-- OQOUDI — foundation: extensions, schemas, enums, privilege baseline
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- Helper functions used by RLS / triggers live in `private`, which is not
-- exposed through PostgREST.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- Functions created from here on are NOT executable by API roles unless
-- granted explicitly. Business functions are granted to service_role only;
-- the Nitro server is the trust boundary (see docs/architecture.md D3).
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role as enum ('customer', 'lawyer', 'admin');
create type public.account_kind as enum ('individual', 'company');
create type public.member_role as enum ('owner', 'member');

create type public.service_kind as enum ('standard', 'written_consultation', 'video_consultation');
create type public.pricing_type as enum ('fixed', 'quote');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.form_version_status as enum ('draft', 'published', 'retired');
create type public.section_key as enum ('about', 'who', 'included', 'deliverables', 'docs', 'steps', 'duration', 'pricing', 'faq', 'reviews');

create type public.order_status as enum (
  'new', 'awaiting_payment', 'under_review', 'awaiting_info',
  'in_progress', 'revision', 'delivered', 'completed', 'cancelled'
);
create type public.payment_status as enum ('unpaid', 'failed', 'paid', 'refunded', 'partially_refunded');
create type public.payment_attempt_status as enum ('initiated', 'pending', 'succeeded', 'failed', 'expired', 'cancelled');
create type public.payment_method as enum ('card', 'wallet', 'fawry');
create type public.refund_status as enum ('requested', 'succeeded', 'failed');

create type public.document_kind as enum ('customer_upload', 'deliverable', 'consultation_response', 'message_attachment');
create type public.document_status as enum ('pending', 'ready');
create type public.booking_status as enum ('held', 'confirmed', 'completed', 'cancelled', 'expired');
create type public.event_visibility as enum ('customer', 'staff');
create type public.actor_kind as enum ('customer', 'lawyer', 'admin', 'system');

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------

-- Localized text: {"ar": "...", "en": "..."} with a non-empty Arabic value.
create or replace function private.is_localized(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select v is not null
     and jsonb_typeof(v) = 'object'
     and jsonb_typeof(v -> 'ar') = 'string'
     and length(btrim(v ->> 'ar')) > 0
     and (not (v ? 'en') or jsonb_typeof(v -> 'en') in ('string', 'null'));
$$;
grant execute on function private.is_localized(jsonb) to anon, authenticated, service_role;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Actor id propagated by business functions (set_config('oq.actor', ..., true))
-- so triggers can attribute changes when running as service_role.
create or replace function private.current_actor()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()),
    nullif(current_setting('oq.actor', true), '')::uuid
  );
$$;
grant execute on function private.current_actor() to authenticated, service_role;

-- Raise a stable, machine-readable application error.
-- The server maps the code (message) to an HTTP status and an i18n key.
create or replace function private.fail(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_code using errcode = 'P0001', detail = coalesce(p_detail, '');
end;
$$;

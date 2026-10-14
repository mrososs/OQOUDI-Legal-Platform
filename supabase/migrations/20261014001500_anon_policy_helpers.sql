-- Helpers referenced by policies that also apply to `anon` (reviews,
-- service_form_versions). They return false for anonymous callers.
grant execute on function private.is_order_staff(uuid) to anon;
grant execute on function private.is_account_member(uuid) to anon;
grant execute on function private.user_has_role(uuid, public.app_role) to anon;

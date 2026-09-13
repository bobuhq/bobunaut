begin;

-- ============================================================
-- BOBU Security Hardening #4
-- Internal auth trigger privilege reduction
-- ============================================================

-- handle_new_builder() is an internal trigger function executed
-- by on_auth_user_created_builder AFTER INSERT ON auth.users.
--
-- It must not be directly executable by public clients.
-- Revoking EXECUTE does not disable the trigger itself.

revoke execute
on function public.handle_new_builder()
from public, anon, authenticated;

grant execute
on function public.handle_new_builder()
to service_role;

comment on function public.handle_new_builder()
is
  'Internal auth.users trigger function. Direct client execution is disabled.';

commit;

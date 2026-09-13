begin;

-- Legacy admin-test purchase RPC must never be directly callable
-- by public, anon or ordinary authenticated clients.
--
-- Public Devnet access is handled by the dedicated Solana Devnet flow.

revoke all
on function public.execute_mars_pixel_admin_test_purchase_v1(
  integer,
  integer,
  integer,
  integer,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.execute_mars_pixel_admin_test_purchase_v1(
  integer,
  integer,
  integer,
  integer,
  text,
  text
)
to service_role;

comment on function public.execute_mars_pixel_admin_test_purchase_v1(
  integer,
  integer,
  integer,
  integer,
  text,
  text
)
is
  'Legacy privileged Mars Pixel test-purchase RPC. Direct client execution is disabled. Public authenticated Devnet testing must use the dedicated Solana Devnet purchase flow.';

commit;

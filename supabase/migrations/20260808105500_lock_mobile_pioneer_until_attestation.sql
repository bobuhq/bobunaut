-- ============================================================
-- BOBU UNIVERSE
-- Mobile Pioneer Security Lock
--
-- Mobile Pioneer rewards remain disabled for direct clients
-- until iOS App Attest / Android Play Integrity verification
-- is deployed server-side.
-- ============================================================

begin;

revoke all
on function public.claim_mobile_pioneer_reward()
from public, anon, authenticated;

grant execute
on function public.claim_mobile_pioneer_reward()
to service_role;

comment on function public.claim_mobile_pioneer_reward() is
  'Internal Mobile Pioneer reward operation. Direct authenticated client execution is disabled until native app attestation is verified server-side.';

commit;

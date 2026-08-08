-- ============================================================
-- BOBU UNIVERSE
-- Mobile Pioneer Reward v1
--
-- Production mobile activation:
--   +500 Personal GP, once per Builder.
--
-- Security:
-- - authenticated Builder only
-- - production native device required
-- - server-authoritative reward amount
-- - immutable GP ledger
-- - account-level idempotency
-- - client cannot choose Builder or GP amount
-- ============================================================

begin;

create or replace function public.claim_mobile_pioneer_reward()
returns table (
  awarded boolean,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_awarded boolean := false;
  v_total_gp bigint := 0;
  v_ledger_id uuid := null;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  /*
   * Do not trust a client supplied "production" flag.
   * Require a production native device that has already
   * been accepted by the server-side device registry.
   */
  if not exists (
    select 1
    from public.builder_push_devices as device
    where device.builder_id = v_builder_id
      and device.enabled = true
      and device.platform in ('ios', 'android')
      and device.app_variant = 'production'
  ) then
    raise exception
      'A registered production BOBU mobile device is required';
  end if;

  /*
   * award_builder_gp() owns all balance mutation and
   * immutable-ledger idempotency.
   *
   * Constant key makes this reward once-per-account,
   * regardless of device count or reinstall count.
   */
  select
    reward.awarded,
    reward.total_gp,
    reward.ledger_id
  into
    v_awarded,
    v_total_gp,
    v_ledger_id
  from public.award_builder_gp(
    v_builder_id,
    'mobile_pioneer',
    500,
    'mobile-pioneer:v1',
    'bobu-mobile',
    jsonb_build_object(
      'source', 'production_mobile_activation',
      'reward_version', 1
    )
  ) as reward;

  return query
  select
    v_awarded,
    500::bigint,
    coalesce(v_total_gp, 0),
    v_ledger_id;
end;
$$;

revoke all
on function public.claim_mobile_pioneer_reward()
from public, anon, authenticated;

grant execute
on function public.claim_mobile_pioneer_reward()
to authenticated;

comment on function public.claim_mobile_pioneer_reward() is
  'Awards the authenticated Builder 500 Personal GP exactly once after a registered production iOS or Android BOBU device is present.';

commit;

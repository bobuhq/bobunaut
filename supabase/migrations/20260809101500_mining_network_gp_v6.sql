-- ============================================================
-- BOBU UNIVERSE
-- Mining Network GP V6
--
-- Goals:
-- 1. Keep Personal Mining GP server-authoritative.
-- 2. Route Network GP through award_pending_network_gp().
-- 3. Preserve one Network reward per mining session.
-- 4. Enforce minimum 50 GP Network reward.
-- 5. Do not modify previously earned rewards.
-- ============================================================

begin;

create or replace function public.claim_builder_mining()
returns table (
  claimed boolean,
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
  v_session public.builder_mining_sessions%rowtype;
  v_reward_result record;

  v_direct_referrer_id uuid;
  v_network_reward bigint;
  v_network_reward_percent integer;
  v_total_builder_count bigint;
  v_network_result record;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  -- Complete expired active sessions.
  update public.builder_mining_sessions as mining_session
  set status = 'completed'
  where mining_session.builder_id = v_builder_id
    and mining_session.status = 'active'
    and mining_session.ends_at <= now();

  -- Lock exactly one completed, unclaimed session.
  select *
  into v_session
  from public.builder_mining_sessions as mining
  where mining.builder_id = v_builder_id
    and mining.status = 'completed'
    and mining.claimed_at is null
  order by mining.started_at desc
  limit 1
  for update;

  if not found then
    raise exception
      'No completed mining session is available to claim';
  end if;

  -- Personal Mining GP.
  select *
  into v_reward_result
  from public.award_builder_gp(
    v_builder_id,
    'builder_mining',
    v_session.reward_gp,
    'builder-mining:' || v_session.id::text,
    'mining',
    jsonb_build_object(
      'session_id', v_session.id,
      'started_at', v_session.started_at,
      'ends_at', v_session.ends_at,
      'base_rate_per_hour', v_session.base_rate_per_hour,
      'economy_version', 6
    )
  );

  /*
   * Network GP is generated only when this invocation
   * actually awarded the Personal Mining reward.
   */
  if v_reward_result.awarded then

    select referral.referrer_id
    into v_direct_referrer_id
    from public.builder_referrals as referral
    where referral.referred_id = v_builder_id
      and referral.status = 'active'
      and referral.activated_at is not null
    order by referral.created_at asc
    limit 1;

    if v_direct_referrer_id is not null then

      select count(*)
      into v_total_builder_count
      from public.builder_profiles;

      v_network_reward_percent :=
        case
          when v_total_builder_count < 1000 then 25
          when v_total_builder_count < 2000 then 20
          when v_total_builder_count < 3000 then 15
          else 10
        end;

      /*
       * Population-tiered Network Mining reward.
       *
       * 50 GP claim:
       *   25% -> 13 GP
       *   20% -> 10 GP
       *   15% ->  8 GP
       *   10% ->  5 GP
       *
       * The mining Builder still receives the full
       * 50 GP Personal Mining reward.
       */
      v_network_reward :=
        round(
          v_session.reward_gp *
          v_network_reward_percent / 100.0
        )::bigint;

      /*
       * Central Network GP Engine:
       * - validates ancestry
       * - validates depth
       * - writes protected ledger
       * - enforces idempotency
       * - credits Pending Network GP
       */
      select *
      into v_network_result
      from public.award_pending_network_gp(
        v_direct_referrer_id,
        v_builder_id,
        v_network_reward,
        'builder_mining_network',
        v_session.id::text,
        1,
        'builder-mining-network:' || v_session.id::text,
        jsonb_build_object(
          'session_id', v_session.id,
          'source_reward_gp', v_session.reward_gp,
          'network_reward_percent',
            v_network_reward_percent,
          'builder_population',
            v_total_builder_count,
          'network_reward_gp',
            v_network_reward,
          'economy_version',
            6
        )
      );

    end if;
  end if;

  update public.builder_mining_sessions as mining_session
  set
    status = 'claimed',
    claimed_at = now(),
    ledger_id = v_reward_result.ledger_id
  where mining_session.id = v_session.id;

  return query
  select
    v_reward_result.awarded,
    v_session.reward_gp,
    v_reward_result.total_gp,
    v_reward_result.ledger_id;
end;
$$;

revoke all
on function public.claim_builder_mining()
from public, anon;

grant execute
on function public.claim_builder_mining()
to authenticated;

comment on function public.claim_builder_mining() is
'Claims server-authoritative Personal Mining GP and generates idempotent Pending Network GP through the centralized Network GP engine using the population-tier launch reward curve.';

commit;

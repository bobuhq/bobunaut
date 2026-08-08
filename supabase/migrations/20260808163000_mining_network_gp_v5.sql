-- ============================================================
-- BOBU UNIVERSE
-- Mining Economy v5
--
-- Personal Mining:
--   50 GP / completed 24-hour session
--
-- Direct Network Mining Reward:
--   Dynamic launch rate based on total Builder population
--
--   0 - 999 Builders       -> 25%
--   1,000 - 1,999 Builders -> 20%
--   2,000 - 2,999 Builders -> 15%
--   3,000+ Builders         -> 10%
--
--   The rate is locked at claim time.
--   Nothing is deducted from the mining Builder.
--
-- Important:
--   - Nothing is deducted from the mining Builder.
--   - Referral activity does not increase Personal Mining rate.
--   - Network GP is generated only after a successful claim.
--   - Only the direct referrer (depth 1) receives this reward.
-- ============================================================

begin;

-- ============================================================
-- START MINING
-- Personal reward is always 50 GP.
-- Referral activity no longer increases Personal Mining.
-- ============================================================

create or replace function public.start_builder_mining()
returns table (
  session_id uuid,
  server_now timestamptz,
  started_at timestamptz,
  ends_at timestamptz,
  active_referral_count bigint,
  base_rate_per_hour numeric,
  referral_bonus_rate numeric,
  total_rate_per_hour numeric,
  reward_gp bigint,
  wallet_gp bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_server_now timestamptz := now();
  v_started_at timestamptz := now();
  v_ends_at timestamptz := now() + interval '24 hours';

  v_base_rate numeric(18, 6) := 50.0 / 24.0;
  v_active_referrals bigint := 0;
  v_session_id uuid;
  v_wallet_gp bigint;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  insert into public.builder_profiles (builder_id)
  values (v_builder_id)
  on conflict (builder_id) do nothing;

  update public.builder_mining_sessions as mining_session
  set status = 'completed'
  where mining_session.builder_id = v_builder_id
    and mining_session.status = 'active'
    and mining_session.ends_at <= v_server_now;

  if exists (
    select 1
    from public.builder_mining_sessions mining
    where mining.builder_id = v_builder_id
      and (
        (
          mining.status = 'active'
          and mining.ends_at > v_server_now
        )
        or (
          mining.status = 'completed'
          and mining.claimed_at is null
        )
      )
  ) then
    raise exception
      'Claim your completed mining session before starting a new one';
  end if;

  /*
   * Keep the active direct Builder count for Network Support UI.
   * It does NOT modify the Builder's Personal Mining reward.
   */
  select count(*)
  into v_active_referrals
  from public.builder_referrals referral
  where referral.referrer_id = v_builder_id
    and referral.status = 'active'
    and exists (
      select 1
      from public.builder_mining_sessions referred_session
      where referred_session.builder_id = referral.referred_id
        and referred_session.status = 'active'
        and referred_session.ends_at > v_server_now
    );

  insert into public.builder_mining_sessions (
    builder_id,
    status,
    started_at,
    ends_at,
    base_rate_per_hour,
    active_referral_count,
    referral_bonus_rate,
    total_rate_per_hour,
    reward_gp
  )
  values (
    v_builder_id,
    'active',
    v_started_at,
    v_ends_at,
    v_base_rate,
    v_active_referrals,
    0,
    v_base_rate,
    50
  )
  returning id into v_session_id;

  select profile.gp
  into v_wallet_gp
  from public.builder_profiles profile
  where profile.builder_id = v_builder_id;

  return query
  select
    v_session_id,
    v_server_now,
    v_started_at,
    v_ends_at,
    v_active_referrals,
    v_base_rate,
    0::numeric,
    v_base_rate,
    50::bigint,
    coalesce(v_wallet_gp, 0);
end;
$$;

revoke all
on function public.start_builder_mining()
from public, anon;

grant execute
on function public.start_builder_mining()
to authenticated;

comment on function public.start_builder_mining() is
'Starts a 24-hour server-authoritative Personal Mining session worth exactly 50 GP. Referral activity does not increase Personal Mining.';


-- ============================================================
-- CLAIM MINING
--
-- 1. Builder receives full Personal Mining reward.
-- 2. Direct referrer receives the current population-tier Network GP reward.
-- 3. Nothing is deducted from the mining Builder.
-- 4. Idempotency prevents duplicate Network GP.
-- ============================================================

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
  v_network_ledger_id uuid;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.builder_mining_sessions as mining_session
  set status = 'completed'
  where mining_session.builder_id = v_builder_id
    and mining_session.status = 'active'
    and mining_session.ends_at <= now();

  select *
  into v_session
  from public.builder_mining_sessions mining
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

  /*
   * Full Personal Mining reward goes to the mining Builder.
   */
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
      'base_rate_per_hour', v_session.base_rate_per_hour
    )
  );

  /*
   * Only generate Network GP when the Personal reward was
   * successfully awarded.
   */
  if v_reward_result.awarded then

    select referral.referrer_id
    into v_direct_referrer_id
    from public.builder_referrals referral
    where referral.referred_id = v_builder_id
      and referral.status = 'active'
    order by referral.created_at asc
    limit 1;

    if v_direct_referrer_id is not null then

      /*
       * Launch Network Reward curve.
       *
       * The population is measured server-side at claim time.
       * Previously earned Network GP is never recalculated.
       */
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
       * Network GP currently uses integer balances.
       * Round to the nearest whole GP:
       *
       * 50 GP @ 25% -> 13 GP
       * 50 GP @ 20% -> 10 GP
       * 50 GP @ 15% ->  8 GP
       * 50 GP @ 10% ->  5 GP
       */
      v_network_reward :=
        round(
          v_session.reward_gp *
          v_network_reward_percent / 100.0
        )::bigint;

      if v_network_reward > 0 then
        /*
         * Insert directly into the protected Network GP ledger.
         * The idempotency key guarantees one Network reward
         * per mining session.
         */
        insert into public.builder_network_gp_ledger (
          builder_id,
          source_builder_id,
          source_reward_type,
          source_reference,
          amount,
          depth,
          status,
          idempotency_key,
          metadata
        )
        values (
          v_direct_referrer_id,
          v_builder_id,
          'builder_mining_network',
          v_session.id::text,
          v_network_reward,
          1,
          'pending',
          'builder-mining-network:' || v_session.id::text,
          jsonb_build_object(
            'session_id', v_session.id,
            'source_reward_gp', v_session.reward_gp,
            'network_reward_percent',
            v_network_reward_percent,
            'builder_population',
            v_total_builder_count,
            'network_reward_gp',
            v_network_reward
          )
        )
        on conflict (
          builder_id,
          idempotency_key
        )
        do nothing
        returning id into v_network_ledger_id;

        if v_network_ledger_id is not null then
          update public.builder_profiles
          set pending_network_gp =
            pending_network_gp + v_network_reward
          where builder_id = v_direct_referrer_id;
        end if;

      end if;
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
'Claims the full Personal Mining reward and generates a population-tiered Pending Network GP reward for the active direct referrer without deducting GP from the mining Builder.';


-- ============================================================
-- MINING TEAM
--
-- contribution_gp represents the current potential direct
-- Network GP reward for one completed 50 GP mining claim.
-- The actual authoritative rate is locked at claim time.
-- ============================================================

create or replace function public.get_my_mining_team()
returns table (
  builder_id uuid,
  username text,
  display_name text,
  referral_status text,
  joined_at timestamptz,
  is_mining_active boolean,
  mining_ends_at timestamptz,
  last_mining_started_at timestamptz,
  contribution_gp bigint,
  last_ping_at timestamptz,
  can_ping boolean,
  next_ping_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  return query
  select
    profile.builder_id,
    profile.username,
    profile.display_name,
    referral.status,
    referral.created_at,

    active_session.id is not null,
    active_session.ends_at,
    latest_session.started_at,

    case
      when referral.status = 'active'
       and active_session.id is not null
      then (
        case
          when (
            select count(*)
            from public.builder_profiles
          ) < 1000 then 13
          when (
            select count(*)
            from public.builder_profiles
          ) < 2000 then 10
          when (
            select count(*)
            from public.builder_profiles
          ) < 3000 then 8
          else 5
        end
      )::bigint
      else 0::bigint
    end,

    latest_ping.created_at,

    (
      active_session.id is null
      and (
        latest_ping.created_at is null
        or latest_ping.created_at
          <= v_now - interval '24 hours'
      )
    ),

    case
      when latest_ping.created_at is null
      then null::timestamptz
      else latest_ping.created_at
        + interval '24 hours'
    end

  from public.builder_referrals referral

  join public.builder_profiles profile
    on profile.builder_id = referral.referred_id

  left join lateral (
    select
      mining.id,
      mining.ends_at
    from public.builder_mining_sessions mining
    where mining.builder_id = referral.referred_id
      and mining.status = 'active'
      and mining.ends_at > v_now
    order by mining.started_at desc
    limit 1
  ) active_session
  on true

  left join lateral (
    select mining.started_at
    from public.builder_mining_sessions mining
    where mining.builder_id = referral.referred_id
    order by mining.started_at desc
    limit 1
  ) latest_session
  on true

  left join lateral (
    select ping.created_at
    from public.builder_mining_pings ping
    where ping.sender_id = v_builder_id
      and ping.receiver_id = referral.referred_id
    order by ping.created_at desc
    limit 1
  ) latest_ping
  on true

  where referral.referrer_id = v_builder_id
    and referral.status in ('pending', 'active')

  order by
    (active_session.id is not null) desc,
    case referral.status
      when 'active' then 0
      else 1
    end,
    profile.display_name nulls last,
    profile.username nulls last,
    referral.created_at asc;
end;
$$;

revoke all
on function public.get_my_mining_team()
from public, anon;

grant execute
on function public.get_my_mining_team()
to authenticated;

comment on function public.get_my_mining_team() is
'Returns direct referral mining activity with the current population-tiered potential Network GP reward. The authoritative reward is calculated at claim time.';

commit;

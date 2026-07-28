-- BOBU Builder Mining Economy v2
--
-- Base reward:
--   25 GP per 24-hour session
--
-- Referral reward:
--   +2 GP per active referral per 24 hours
--
-- Maximum active referrals:
--   25
--
-- Maximum reward:
--   75 GP per 24-hour session
--
-- Rewards remain server-authoritative.

-- Fix PL/pgSQL output-column and table-column ambiguity.
-- Mining session data and reward rules are unchanged.

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

  v_base_rate numeric(18, 6) := 25.0 / 24.0;
  v_bonus_per_active_referral numeric(18, 6) := 2.0 / 24.0;
  v_max_active_referrals bigint := 25;

  v_active_referrals bigint := 0;
  v_referral_bonus_rate numeric(18, 6);
  v_total_rate numeric(18, 6);
  v_reward_gp bigint;
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

  select least(count(*), v_max_active_referrals)
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

  v_referral_bonus_rate :=
    v_active_referrals * v_bonus_per_active_referral;

  v_total_rate :=
    v_base_rate + v_referral_bonus_rate;

  v_reward_gp :=
    greatest(round(v_total_rate * 24)::bigint, 1);

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
    v_referral_bonus_rate,
    v_total_rate,
    v_reward_gp
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
    v_referral_bonus_rate,
    v_total_rate,
    v_reward_gp,
    coalesce(v_wallet_gp, 0);
end;
$$;


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
    raise exception 'No completed mining session is available to claim';
  end if;

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
      'active_referral_count', v_session.active_referral_count,
      'referral_bonus_rate', v_session.referral_bonus_rate,
      'total_rate_per_hour', v_session.total_rate_per_hour
    )
  );

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


create or replace function public.get_my_mining_state()
returns table (
  session_id uuid,
  server_now timestamptz,
  started_at timestamptz,
  ends_at timestamptz,
  status text,
  active boolean,
  claimable boolean,
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
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.builder_mining_sessions as mining_session
  set status = 'completed'
  where mining_session.builder_id = v_builder_id
    and mining_session.status = 'active'
    and mining_session.ends_at <= now();

  return query
  select
    mining.id,
    now(),
    mining.started_at,
    mining.ends_at,
    mining.status,
    mining.status = 'active' and mining.ends_at > now(),
    mining.status = 'completed' and mining.claimed_at is null,
    mining.active_referral_count,
    mining.base_rate_per_hour,
    mining.referral_bonus_rate,
    mining.total_rate_per_hour,
    mining.reward_gp,
    profile.gp
  from public.builder_profiles profile
  left join lateral (
    select session.*
    from public.builder_mining_sessions session
    where session.builder_id = profile.builder_id
      and session.status in ('active', 'completed')
    order by session.started_at desc
    limit 1
  ) mining on true
  where profile.builder_id = v_builder_id;
end;
$$;


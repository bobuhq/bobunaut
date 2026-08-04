-- BOBU Builder Mining Economy v3
--
-- Base reward:
--   50 GP per 24-hour session
--
-- Referral reward:
--   +5 GP per active direct referral per 24 hours
--
-- Maximum active referrals:
--   25
--
-- Maximum reward:
--   175 GP per 24-hour session
--
-- Active referral count is calculated and locked when the
-- mining session starts. Existing active sessions are not
-- retroactively changed.
--
-- Rewards remain server-authoritative.

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
  v_bonus_per_active_referral numeric(18, 6) := 5.0 / 24.0;
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
    greatest(round(v_total_rate * 24)::bigint, 50);

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

comment on function public.start_builder_mining() is
'Starts a 24-hour server-authoritative mining session with a 50 GP base reward and +5 GP for each active direct referral, capped at 25 referrals.';

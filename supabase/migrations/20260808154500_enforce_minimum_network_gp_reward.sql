-- ============================================================
-- BOBU UNIVERSE
-- Mining Economy v4
-- Enforce minimum GP earning rule
-- ============================================================
--
-- Base mining reward:
--   50 GP / 24 hours
--
-- Active direct referral contribution:
--   +50 GP / referral / 24 hours
--
-- Maximum active referrals:
--   25
--
-- Maximum mining session reward:
--   1,300 GP
--
-- Rewards remain server-authoritative.
-- ============================================================

begin;

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
  v_bonus_per_active_referral numeric(18, 6) := 50.0 / 24.0;
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

revoke all
on function public.start_builder_mining()
from public, anon;

grant execute
on function public.start_builder_mining()
to authenticated;

comment on function public.start_builder_mining() is
'Starts a 24-hour server-authoritative mining session with a 50 GP base reward and +50 GP for each active direct referral, capped at 25 referrals.';

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
    (
      active_session.id is not null
    ) as is_mining_active,
    active_session.ends_at,
    latest_session.started_at,
    case
      when referral.status = 'active'
       and active_session.id is not null
      then 50::bigint
      else 0::bigint
    end as contribution_gp,
    latest_ping.created_at,
    (
      active_session.id is null
      and (
        latest_ping.created_at is null
        or latest_ping.created_at <= v_now - interval '24 hours'
      )
    ) as can_ping,
    case
      when latest_ping.created_at is null then null
      else latest_ping.created_at + interval '24 hours'
    end as next_ping_at
  from public.builder_referrals referral
  join public.builder_profiles profile
    on profile.builder_id = referral.referred_id

  left join lateral (
    select mining.id, mining.ends_at
    from public.builder_mining_sessions mining
    where mining.builder_id = referral.referred_id
      and mining.status = 'active'
      and mining.ends_at > v_now
    order by mining.started_at desc
    limit 1
  ) active_session on true

  left join lateral (
    select mining.started_at
    from public.builder_mining_sessions mining
    where mining.builder_id = referral.referred_id
    order by mining.started_at desc
    limit 1
  ) latest_session on true

  left join lateral (
    select ping.created_at
    from public.builder_mining_pings ping
    where ping.sender_id = v_builder_id
      and ping.receiver_id = referral.referred_id
    order by ping.created_at desc
    limit 1
  ) latest_ping on true

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
'Returns all authenticated Builder direct pending and active referrals. Only active referrals with active mining contribute +50 GP.';

commit;

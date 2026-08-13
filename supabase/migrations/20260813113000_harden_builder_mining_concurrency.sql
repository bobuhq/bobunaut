begin;

create unique index if not exists
  builder_mining_sessions_one_active_per_builder
on public.builder_mining_sessions (builder_id)
where status = 'active';

create or replace function public.start_builder_mining()
returns table(
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
as $function$
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

  /*
   * Serialize mining-session creation for this Builder.
   *
   * This prevents two concurrent start requests from both
   * passing the "no active session" check before either
   * request inserts its session.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'builder-mining:' || v_builder_id::text,
      0
    )
  );

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
$function$;

revoke all on function public.start_builder_mining()
from public, anon;

grant execute on function public.start_builder_mining()
to authenticated, service_role;

comment on function public.start_builder_mining() is
'Starts one 24-hour Builder mining session. Uses a transaction-scoped Builder lock and a database unique index to prevent concurrent duplicate active sessions.';

commit;

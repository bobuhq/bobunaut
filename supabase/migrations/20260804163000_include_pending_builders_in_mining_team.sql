-- ============================================================
-- BOBU UNIVERSE
-- Include pending direct referrals in Mining Team
-- ============================================================
--
-- All direct referrals with pending or active status are visible.
-- Only active referrals with an active mining session contribute
-- +5 GP to the next mining session.
-- Pending and active inactive Builders may receive a Wake ping.
-- ============================================================

begin;

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
      then 5::bigint
      else 0::bigint
    end,

    latest_ping.created_at,

    (
      active_session.id is null
      and (
        latest_ping.created_at is null
        or latest_ping.created_at
          <= now() - interval '24 hours'
      )
    ),

    case
      when latest_ping.created_at is null
      then null::timestamptz
      else latest_ping.created_at
        + interval '24 hours'
    end

  from public.builder_referrals as referral

  join public.builder_profiles as profile
    on profile.builder_id = referral.referred_id

  left join lateral (
    select
      mining.id,
      mining.ends_at
    from public.builder_mining_sessions as mining
    where mining.builder_id = profile.builder_id
      and mining.status = 'active'
      and mining.ends_at > now()
    order by mining.started_at desc
    limit 1
  ) as active_session
    on true

  left join lateral (
    select mining.started_at
    from public.builder_mining_sessions as mining
    where mining.builder_id = profile.builder_id
    order by mining.started_at desc
    limit 1
  ) as latest_session
    on true

  left join lateral (
    select ping.created_at
    from public.builder_mining_pings as ping
    where ping.sender_id = v_builder_id
      and ping.receiver_id = profile.builder_id
    order by ping.created_at desc
    limit 1
  ) as latest_ping
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
'Returns all authenticated Builder direct pending and active referrals. Only active referrals with active mining contribute +5 GP.';


create or replace function public.ping_inactive_builder(
  p_target_builder_id uuid
)
returns table (
  sent boolean,
  receiver_id uuid,
  pinged_at timestamptz,
  next_ping_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender_id uuid := auth.uid();
  v_pinged_at timestamptz := now();
  v_last_ping_at timestamptz;
begin
  if v_sender_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_target_builder_id is null then
    raise exception 'Target Builder ID is required';
  end if;

  if p_target_builder_id = v_sender_id then
    raise exception 'You cannot ping yourself';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(
      v_sender_id::text
      || ':'
      || p_target_builder_id::text
    )::bigint
  );

  if not exists (
    select 1
    from public.builder_referrals as referral
    where referral.referrer_id = v_sender_id
      and referral.referred_id = p_target_builder_id
      and referral.status in ('pending', 'active')
  ) then
    raise exception
      'Target Builder is not your direct referral';
  end if;

  if exists (
    select 1
    from public.builder_mining_sessions as mining
    where mining.builder_id = p_target_builder_id
      and mining.status = 'active'
      and mining.ends_at > v_pinged_at
  ) then
    raise exception
      'Target Builder already has an active mining session';
  end if;

  select ping.created_at
  into v_last_ping_at
  from public.builder_mining_pings as ping
  where ping.sender_id = v_sender_id
    and ping.receiver_id = p_target_builder_id
  order by ping.created_at desc
  limit 1;

  if (
    v_last_ping_at is not null
    and v_last_ping_at >
      v_pinged_at - interval '24 hours'
  ) then
    raise exception
      'This Builder has already been pinged within the last 24 hours';
  end if;

  insert into public.builder_mining_pings (
    sender_id,
    receiver_id,
    created_at
  )
  values (
    v_sender_id,
    p_target_builder_id,
    v_pinged_at
  );

  return query
  select
    true,
    p_target_builder_id,
    v_pinged_at,
    v_pinged_at + interval '24 hours';
end;
$$;

revoke all
on function public.ping_inactive_builder(uuid)
from public, anon;

grant execute
on function public.ping_inactive_builder(uuid)
to authenticated;

comment on function public.ping_inactive_builder(uuid) is
'Sends a rate-limited Wake signal to an inactive pending or active direct referral.';

commit;

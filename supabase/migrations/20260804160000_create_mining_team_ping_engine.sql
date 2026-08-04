-- ============================================================
-- BOBU UNIVERSE
-- Mining Team + Ping Engine v1
-- ============================================================
--
-- Mining economy:
--   Base reward: 50 GP / 24 hours
--   Active direct referral contribution: +5 GP / 24 hours
--
-- Ping protection:
--   - Direct active referrals only
--   - Active miners cannot be pinged
--   - One ping per receiver every 24 hours
--   - All validation is server-authoritative
-- ============================================================

begin;

create table if not exists public.builder_mining_pings (
  id uuid primary key default gen_random_uuid(),

  sender_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  receiver_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint builder_mining_pings_no_self_ping
    check (sender_id <> receiver_id)
);

create index if not exists
  builder_mining_pings_sender_receiver_created_idx
on public.builder_mining_pings (
  sender_id,
  receiver_id,
  created_at desc
);

create index if not exists
  builder_mining_pings_receiver_created_idx
on public.builder_mining_pings (
  receiver_id,
  created_at desc
);

alter table public.builder_mining_pings
enable row level security;

revoke all
on table public.builder_mining_pings
from public, anon, authenticated;

comment on table public.builder_mining_pings is
'Server-authoritative history of Mining Team activation pings between direct Builder referrals.';


-- ============================================================
-- GET MY MINING TEAM
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
      when active_session.id is not null
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
    select
      mining.started_at
    from public.builder_mining_sessions as mining
    where mining.builder_id = profile.builder_id
    order by mining.started_at desc
    limit 1
  ) as latest_session
    on true

  left join lateral (
    select
      ping.created_at
    from public.builder_mining_pings as ping
    where ping.sender_id = v_builder_id
      and ping.receiver_id = profile.builder_id
    order by ping.created_at desc
    limit 1
  ) as latest_ping
    on true

  where referral.referrer_id = v_builder_id
    and referral.status = 'active'

  order by
    (active_session.id is not null) desc,
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
'Returns the authenticated Builder direct active referrals with current mining activity, +5 GP contribution state and ping cooldown information.';


-- ============================================================
-- PING INACTIVE BUILDER
-- ============================================================

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

  -- Serialize ping attempts for the same sender/receiver pair.
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
      and referral.referred_id =
        p_target_builder_id
      and referral.status = 'active'
  ) then
    raise exception
      'Target Builder is not an active direct referral';
  end if;

  if exists (
    select 1
    from public.builder_mining_sessions as mining
    where mining.builder_id =
      p_target_builder_id
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
    and ping.receiver_id =
      p_target_builder_id
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
'Creates a rate-limited activation ping for an inactive direct referral. Push delivery will be connected in a later notification integration.';

commit;

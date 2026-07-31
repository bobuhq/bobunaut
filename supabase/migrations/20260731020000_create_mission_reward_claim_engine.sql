-- ============================================================
-- BOBU UNIVERSE
-- Server-Authoritative Mission Reward Claim Engine
-- ============================================================


-- ============================================================
-- MISSION REWARD CATALOG
--
-- This is the server-side authority for mission GP rewards.
-- Browser clients cannot read or modify this table directly.
-- ============================================================

create table if not exists public.mission_reward_catalog (
  mission_id text primary key
    check (
      char_length(trim(mission_id))
      between 1 and 150
    ),

  reward_gp bigint not null
    check (reward_gp >= 50),

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


comment on table public.mission_reward_catalog is
  'Server-authoritative GP reward definitions for BOBU missions.';

comment on column public.mission_reward_catalog.reward_gp is
  'Trusted GP amount awarded after a mission reward is claimed.';


drop trigger if exists mission_reward_catalog_set_updated_at
  on public.mission_reward_catalog;

create trigger mission_reward_catalog_set_updated_at
before update on public.mission_reward_catalog
for each row
execute function public.bobu_set_updated_at();


alter table public.mission_reward_catalog
  enable row level security;


revoke all
on table public.mission_reward_catalog
from public, anon, authenticated;


-- ============================================================
-- INITIAL SERVER MISSION CATALOG
-- ============================================================

insert into public.mission_reward_catalog (
  mission_id,
  reward_gp,
  enabled
)
values (
  'start-mining',
  50,
  true
)
on conflict (mission_id)
do update
set
  reward_gp = excluded.reward_gp,
  enabled = excluded.enabled,
  updated_at = now();


-- ============================================================
-- CLAIM MISSION REWARD
--
-- Guarantees:
-- 1. Builder identity comes from auth.uid().
-- 2. GP amount comes only from the server catalog.
-- 3. Mission must already be completed.
-- 4. Mission + cycle can reward only once.
-- 5. Ledger entry, GP update and claim state are atomic.
-- ============================================================

create or replace function public.claim_my_mission_reward(
  p_mission_id text,
  p_cycle_key text
)
returns table (
  claimed_now boolean,
  mission_id text,
  cycle_key text,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid;
  v_mission_id text;
  v_cycle_key text;
  v_reward_gp bigint;
  v_progress public.mission_progress;
  v_awarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
  v_claimed_at timestamptz;
begin
  v_builder_id := auth.uid();
  v_mission_id := trim(coalesce(p_mission_id, ''));
  v_cycle_key := trim(coalesce(p_cycle_key, ''));

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_mission_id = '' then
    raise exception 'Mission ID is required.';
  end if;

  if v_cycle_key = '' then
    raise exception 'Cycle key is required.';
  end if;

  select catalog.reward_gp
  into v_reward_gp
  from public.mission_reward_catalog as catalog
  where catalog.mission_id = v_mission_id
    and catalog.enabled = true;

  if v_reward_gp is null then
    raise exception
      'Mission reward is not available.';
  end if;

  select progress.*
  into v_progress
  from public.mission_progress as progress
  where progress.builder_id = v_builder_id
    and progress.mission_id = v_mission_id
    and progress.cycle_key = v_cycle_key
  for update;

  if not found then
    raise exception
      'Mission progress was not found.';
  end if;

  if v_progress.status = 'claimed'
     or v_progress.claimed_at is not null then

    select profile.gp
    into v_total_gp
    from public.builder_profiles as profile
    where profile.builder_id = v_builder_id;

    return query
    select
      false,
      v_mission_id,
      v_cycle_key,
      v_reward_gp,
      coalesce(v_total_gp, 0),
      null::uuid,
      v_progress.claimed_at;

    return;
  end if;

  if v_progress.status <> 'completed'
     or v_progress.completed_at is null then
    raise exception
      'Mission must be completed before its reward can be claimed.';
  end if;

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
    'mission',
    v_reward_gp,
    concat(
      'mission:',
      v_mission_id,
      ':',
      v_cycle_key
    ),
    null,
    jsonb_build_object(
      'mission_id',
      v_mission_id,
      'cycle_key',
      v_cycle_key
    )
  ) as reward;

  v_claimed_at := now();

  update public.mission_progress
  set
    status = 'claimed',
    claimed_at = v_claimed_at,
    version = version + 1,
    updated_at = now()
  where id = v_progress.id;

  return query
  select
    v_awarded,
    v_mission_id,
    v_cycle_key,
    v_reward_gp,
    v_total_gp,
    v_ledger_id,
    v_claimed_at;
end;
$$;


revoke all
on function public.claim_my_mission_reward(
  text,
  text
)
from public, anon;


grant execute
on function public.claim_my_mission_reward(
  text,
  text
)
to authenticated;

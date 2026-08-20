-- ============================================================
-- BOBU UNIVERSE
-- Mission -> Mars Contribution Integration v1
--
-- Server authoritative.
--
-- A mission contributes to Mars only when it has an enabled
-- mapping in mars_mission_contribution_catalog.
--
-- Existing mining missions intentionally have no Mars mapping.
-- ============================================================


-- ============================================================
-- 1. MISSION -> MARS CONTRIBUTION CATALOG
-- ============================================================

create table if not exists public.mars_mission_contribution_catalog (
  mission_id text primary key,

  contribution_type text not null
    check (
      contribution_type in (
        'general',
        'habitats',
        'energy',
        'water',
        'science',
        'exploration',
        'security'
      )
    ),

  contribution_amount bigint not null
    check (contribution_amount > 0),

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mars_mission_contribution_catalog_mission_fk
    foreign key (mission_id)
    references public.mission_reward_catalog(mission_id)
    on update cascade
    on delete cascade
);


comment on table public.mars_mission_contribution_catalog is
  'Server-authoritative mapping of eligible missions to Mars civilization contributions.';


alter table public.mars_mission_contribution_catalog
  enable row level security;


revoke all
on table public.mars_mission_contribution_catalog
from public, anon, authenticated;


-- Existing mining missions are deliberately NOT inserted here.
-- Only actual Mars/civilization missions should receive mappings.


-- ============================================================
-- 2. REPLACE MISSION CLAIM RPC
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

  v_contribution_type text;
  v_contribution_amount bigint;
  v_contribution_enabled boolean;
  v_contribution_reference text;
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


  -- ----------------------------------------------------------
  -- Trusted GP reward definition.
  -- ----------------------------------------------------------

  select catalog.reward_gp
  into v_reward_gp
  from public.mission_reward_catalog as catalog
  where catalog.mission_id = v_mission_id
    and catalog.enabled = true;

  if v_reward_gp is null then
    raise exception
      'Mission reward is not available.';
  end if;


  -- ----------------------------------------------------------
  -- Lock mission progress.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Already claimed.
  --
  -- Do not attempt contribution again here.
  -- The original successful claim transaction is responsible
  -- for both GP and any eligible Mars contribution.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- GP reward.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Optional Mars contribution.
  --
  -- Absence of a catalog mapping means the mission does not
  -- affect Mars.
  -- ----------------------------------------------------------

  select
    catalog.contribution_type,
    catalog.contribution_amount,
    catalog.enabled
  into
    v_contribution_type,
    v_contribution_amount,
    v_contribution_enabled
  from public.mars_mission_contribution_catalog as catalog
  where catalog.mission_id = v_mission_id;

  if found
     and v_contribution_enabled = true
     and v_contribution_amount > 0 then

    v_contribution_reference :=
      concat(
        'mission:',
        v_mission_id,
        ':',
        v_cycle_key
      );

    perform *
    from public.record_mars_contribution_internal(
      v_builder_id,
      'mission',
      v_contribution_reference,
      v_contribution_type,
      v_contribution_amount,
      jsonb_build_object(
        'mission_id',
        v_mission_id,
        'cycle_key',
        v_cycle_key,
        'reward_gp',
        v_reward_gp
      )
    );
  end if;


  -- ----------------------------------------------------------
  -- Finalize mission claim.
  -- ----------------------------------------------------------

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


comment on function public.claim_my_mission_reward(
  text,
  text
) is
  'Atomically claims server-authoritative mission GP and records an optional mapped Mars contribution.';


-- ============================================================
-- 3. SECURITY
-- ============================================================

revoke all
on table public.mars_mission_contribution_catalog
from public, anon, authenticated;


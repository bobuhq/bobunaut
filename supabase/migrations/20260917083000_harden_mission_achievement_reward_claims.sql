-- BOBU Core
-- Harden Mission + Achievement Reward Claims
-- Browser progress remains usable for UI state.
-- GP claims require authoritative server-side evidence.

create or replace function public.claim_my_achievement_reward(
  p_achievement_id text
)
returns table(
  claimed_now boolean,
  achievement_id text,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_builder_id uuid;
  v_achievement_id text;
  v_reward_gp bigint;
  v_progress public.achievement_progress;
  v_awarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
  v_claimed_at timestamptz;
  v_required_sessions bigint;
  v_verified_sessions bigint;
begin
  v_builder_id := auth.uid();
  v_achievement_id := trim(coalesce(p_achievement_id, ''));

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_achievement_id = '' then
    raise exception 'Achievement ID is required.';
  end if;

  select catalog.reward_gp
  into v_reward_gp
  from public.achievement_reward_catalog catalog
  where catalog.achievement_id = v_achievement_id
    and catalog.enabled = true;

  if v_reward_gp is null then
    raise exception 'Achievement reward is not available.';
  end if;

  select progress.*
  into v_progress
  from public.achievement_progress progress
  where progress.builder_id = v_builder_id
    and progress.achievement_id = v_achievement_id
  for update;

  if not found then
    raise exception 'Achievement progress was not found.';
  end if;

  if v_progress.status = 'claimed'
     or v_progress.claimed_at is not null then

    select profile.gp
    into v_total_gp
    from public.builder_profiles profile
    where profile.builder_id = v_builder_id;

    return query
    select
      false,
      v_achievement_id,
      v_reward_gp,
      coalesce(v_total_gp, 0),
      null::uuid,
      v_progress.claimed_at;

    return;
  end if;

  if v_progress.status <> 'unlocked'
     or v_progress.unlocked_at is null then
    raise exception
      'Achievement must be unlocked before its reward can be claimed.';
  end if;

  -- Authoritative mining proof.
  v_required_sessions :=
    case v_achievement_id
      when 'first-mining-session' then 1
      when 'three-mining-sessions' then 3
      when 'seven-mining-sessions' then 7
      when 'thirty-mining-sessions' then 30
      else null
    end;

  if v_required_sessions is null then
    raise exception
      'Achievement has no authoritative reward proof.';
  end if;

  select count(*)
  into v_verified_sessions
  from public.builder_mining_sessions session_row
  where session_row.builder_id = v_builder_id
    and session_row.status = 'claimed'
    and session_row.claimed_at is not null
    and session_row.ledger_id is not null;

  if v_verified_sessions < v_required_sessions then
    raise exception
      'Achievement reward proof is not satisfied.';
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
    'achievement',
    v_reward_gp,
    concat('achievement:', v_achievement_id),
    null,
    jsonb_build_object(
      'achievement_id', v_achievement_id,
      'verified_mining_sessions', v_verified_sessions
    )
  ) reward;

  v_claimed_at := now();

  update public.achievement_progress
  set
    status = 'claimed',
    claimed_at = v_claimed_at,
    version = version + 1,
    updated_at = now()
  where id = v_progress.id;

  return query
  select
    v_awarded,
    v_achievement_id,
    v_reward_gp,
    v_total_gp,
    v_ledger_id,
    v_claimed_at;
end;
$function$;


create or replace function public.claim_my_mission_reward(
  p_mission_id text,
  p_cycle_key text
)
returns table(
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
as $function$
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

  v_server_proof boolean := false;
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
  from public.mission_reward_catalog catalog
  where catalog.mission_id = v_mission_id
    and catalog.enabled = true;

  if v_reward_gp is null then
    raise exception 'Mission reward is not available.';
  end if;

  select progress.*
  into v_progress
  from public.mission_progress progress
  where progress.builder_id = v_builder_id
    and progress.mission_id = v_mission_id
    and progress.cycle_key = v_cycle_key
  for update;

  if not found then
    raise exception 'Mission progress was not found.';
  end if;

  if v_progress.status = 'claimed'
     or v_progress.claimed_at is not null then

    select profile.gp
    into v_total_gp
    from public.builder_profiles profile
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
  -- AUTHORITATIVE SERVER PROOF
  -- ----------------------------------------------------------

  if v_mission_id = 'start-mining' then

    -- Current production mining missions use the canonical
    -- cycle key "default".
    if v_cycle_key <> 'default' then
      raise exception
        'Invalid mining mission cycle.';
    end if;

    -- Starting a real server-side mining session is sufficient
    -- proof for the Start Mining mission.
    select exists (
      select 1
      from public.builder_mining_sessions s
      where s.builder_id = v_builder_id
        and s.started_at is not null
    )
    into v_server_proof;

  elsif v_mission_id = 'complete-mining' then

    if v_cycle_key <> 'default' then
      raise exception
        'Invalid mining mission cycle.';
    end if;

    -- A completed mining mission requires an economically
    -- finalized server-side session with a reward ledger entry.
    select exists (
      select 1
      from public.builder_mining_sessions s
      where s.builder_id = v_builder_id
        and s.status = 'claimed'
        and s.claimed_at is not null
        and s.ledger_id is not null
    )
    into v_server_proof;

  elsif v_mission_id in (
    'mars-create-colony',
    'mars-assign-sector',
    'mars-construct-building',
    'mars-upgrade-building',
    'mars-claim-resources'
  ) then

    -- Mars progress cannot be written through the generic
    -- authenticated client writer. It is produced by the
    -- internal server-authoritative Mars mission engine.
    --
    -- Require the canonical server catalog mapping and the
    -- lifetime cycle generated by that engine.
    select exists (
      select 1
      from public.mars_mission_progress_catalog catalog
      where catalog.mission_id = v_mission_id
        and catalog.enabled = true
        and catalog.cycle_key = 'lifetime'
        and v_cycle_key = catalog.cycle_key
    )
    into v_server_proof;

  else

    -- Fail closed for any future economic mission until an
    -- authoritative proof rule is explicitly implemented.
    v_server_proof := false;

  end if;

  if not v_server_proof then
    raise exception
      'Mission reward proof is not satisfied.';
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
      'mission_id', v_mission_id,
      'cycle_key', v_cycle_key,
      'server_verified', true
    )
  ) reward;

  select
    catalog.contribution_type,
    catalog.contribution_amount,
    catalog.enabled
  into
    v_contribution_type,
    v_contribution_amount,
    v_contribution_enabled
  from public.mars_mission_contribution_catalog catalog
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
        'mission_id', v_mission_id,
        'cycle_key', v_cycle_key,
        'reward_gp', v_reward_gp
      )
    );
  end if;

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
$function$;


-- Explicit privilege posture.
revoke all on function public.claim_my_achievement_reward(text)
from public, anon;

grant execute on function public.claim_my_achievement_reward(text)
to authenticated;


revoke all on function public.claim_my_mission_reward(text, text)
from public, anon;

grant execute on function public.claim_my_mission_reward(text, text)
to authenticated;


-- ============================================================
-- Harden generic mission progress writer
-- ============================================================

create or replace function public.save_my_mission_progress(
  p_mission_id text,
  p_cycle_key text,
  p_status text,
  p_progress bigint,
  p_version bigint,
  p_last_event_at timestamptz default null,
  p_completed_at timestamptz default null,
  p_claimed_at timestamptz default null
)
returns public.mission_progress
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_builder_id uuid;
  v_mission_id text;
  v_row public.mission_progress;
begin
  v_builder_id := auth.uid();
  v_mission_id := trim(coalesce(p_mission_id, ''));

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_mission_id = '' then
    raise exception 'Mission ID is required.';
  end if;

  if trim(coalesce(p_cycle_key, '')) = '' then
    raise exception 'Cycle key is required.';
  end if;

  if trim(coalesce(p_status, '')) = '' then
    raise exception 'Mission status is required.';
  end if;

  -- Mars mission progress is server-authoritative.
  -- Authenticated clients must never create or modify it through
  -- the generic progress writer.
  if exists (
    select 1
    from public.mars_mission_progress_catalog catalog
    where catalog.mission_id = v_mission_id
  ) then
    raise exception
      'Mars mission progress is server-authoritative.';
  end if;

  -- Client progress writer can never mark a reward as claimed.
  if trim(p_status) = 'claimed'
     or p_claimed_at is not null then
    raise exception
      'Mission rewards can only be claimed by the reward engine.';
  end if;

  insert into public.mission_progress (
    builder_id,
    mission_id,
    cycle_key,
    status,
    progress,
    version,
    last_event_at,
    completed_at,
    claimed_at
  )
  values (
    v_builder_id,
    v_mission_id,
    trim(p_cycle_key),
    trim(p_status),
    greatest(0, p_progress),
    greatest(1, p_version),
    p_last_event_at,
    p_completed_at,
    null
  )

  on conflict (
    builder_id,
    mission_id,
    cycle_key
  )

  do update
  set
    status = excluded.status,
    progress = excluded.progress,
    version = greatest(
      mission_progress.version,
      excluded.version
    ),
    last_event_at = excluded.last_event_at,
    completed_at = excluded.completed_at,
    -- Never overwrite server claim state.
    claimed_at = mission_progress.claimed_at,
    updated_at = now()

  -- A claimed row is immutable through this client writer.
  where mission_progress.status <> 'claimed'
    and mission_progress.claimed_at is null

  returning *
  into v_row;

  if v_row.id is null then
    raise exception
      'Claimed mission progress cannot be modified.';
  end if;

  return v_row;
end;
$function$;


revoke all on function public.save_my_mission_progress(
  text,
  text,
  text,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  timestamptz
)
from public, anon;

grant execute on function public.save_my_mission_progress(
  text,
  text,
  text,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  timestamptz
)
to authenticated;

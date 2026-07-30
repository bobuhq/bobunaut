-- ============================================================
-- BOBU UNIVERSE
-- Mission Progress Write RPC
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
set search_path = public
as
$$
declare
  v_builder_id uuid;
  v_row public.mission_progress;
begin

  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  if trim(p_mission_id) = '' then
    raise exception 'Mission ID is required.';
  end if;

  if trim(p_cycle_key) = '' then
    raise exception 'Cycle key is required.';
  end if;

  if trim(p_status) = '' then
    raise exception 'Mission status is required.';
  end if;


  insert into public.mission_progress
  (
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
  values
  (
    v_builder_id,
    trim(p_mission_id),
    trim(p_cycle_key),
    trim(p_status),
    greatest(0, p_progress),
    greatest(1, p_version),
    p_last_event_at,
    p_completed_at,
    p_claimed_at
  )

  on conflict
  (
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
    claimed_at = excluded.claimed_at,
    updated_at = now()

  returning *
  into v_row;

  return v_row;

end;
$$;

revoke all
on function public.save_my_mission_progress(
  text,
  text,
  text,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  timestamptz
)
from public;

grant execute
on function public.save_my_mission_progress(
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

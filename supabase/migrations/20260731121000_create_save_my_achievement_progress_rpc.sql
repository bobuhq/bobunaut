-- ============================================================
-- BOBU UNIVERSE
-- Achievement Progress Write RPC
-- ============================================================

create or replace function public.save_my_achievement_progress(
  p_achievement_id text,
  p_status text,
  p_progress bigint,
  p_version bigint,
  p_last_event_at timestamptz default null,
  p_unlocked_at timestamptz default null,
  p_claimed_at timestamptz default null
)
returns public.achievement_progress
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_builder_id uuid;
  v_row public.achievement_progress;
begin

  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required.';
  end if;

  if trim(p_achievement_id) = '' then
    raise exception 'Achievement ID is required.';
  end if;

  if trim(p_status) = '' then
    raise exception 'Achievement status is required.';
  end if;

  insert into public.achievement_progress
  (
    builder_id,
    achievement_id,
    status,
    progress,
    version,
    last_event_at,
    unlocked_at,
    claimed_at
  )
  values
  (
    v_builder_id,
    trim(p_achievement_id),
    trim(p_status),
    greatest(0, p_progress),
    greatest(1, p_version),
    p_last_event_at,
    p_unlocked_at,
    p_claimed_at
  )

  on conflict
  (
    builder_id,
    achievement_id
  )

  do update
  set
    status = excluded.status,
    progress = excluded.progress,
    version = greatest(
      achievement_progress.version,
      excluded.version
    ),
    last_event_at = excluded.last_event_at,
    unlocked_at = excluded.unlocked_at,
    claimed_at = excluded.claimed_at,
    updated_at = now()

  returning *
  into v_row;

  return v_row;

end;
$$;

revoke all
on function public.save_my_achievement_progress(
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
on function public.save_my_achievement_progress(
  text,
  text,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  timestamptz
)
to authenticated;

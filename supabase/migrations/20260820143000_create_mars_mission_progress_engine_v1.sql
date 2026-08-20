-- ============================================================
-- BOBU Universe
-- Mars Mission Progress Engine v1
--
-- Server-authoritative Mars mission progression.
--
-- IMPORTANT:
-- - Browser cannot execute the internal progress RPC.
-- - Browser cannot directly mutate mission_progress.
-- - Mars production RPCs will call this function internally.
-- - Mission GP remains claimable only through
--   claim_my_mission_reward().
-- ============================================================


-- ============================================================
-- 1. Mars mission progression catalog
-- ============================================================

create table if not exists public.mars_mission_progress_catalog (
  mission_id text primary key
    references public.mission_reward_catalog(mission_id)
    on update cascade
    on delete cascade,

  mars_event_type text not null,

  target bigint not null
    check (target > 0),

  cycle_key text not null
    default 'lifetime',

  enabled boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint mars_mission_progress_catalog_event_check
    check (
      mars_event_type in (
        'COLONY_CREATED',
        'SECTOR_ASSIGNED',
        'BUILDING_CONSTRUCTED',
        'BUILDING_UPGRADED',
        'RESOURCES_CLAIMED'
      )
    )
);


comment on table public.mars_mission_progress_catalog is
  'Authoritative mapping between verified Mars server events and mission progress.';


alter table public.mars_mission_progress_catalog
  enable row level security;


revoke all
on table public.mars_mission_progress_catalog
from public, anon, authenticated;


-- ============================================================
-- 2. Internal Mars mission progress recorder
-- ============================================================

create or replace function public.record_mars_mission_progress_internal(
  p_builder_id uuid,
  p_event_type text,
  p_increment bigint default 1,
  p_occurred_at timestamptz default now()
)
returns table(
  mission_id text,
  cycle_key text,
  progress bigint,
  target bigint,
  status text,
  completed_now boolean,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mapping record;
  v_existing public.mission_progress%rowtype;

  v_progress bigint;
  v_status text;
  v_completed_now boolean;
  v_completed_at timestamptz;
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  if p_event_type is null
     or length(trim(p_event_type)) = 0 then
    raise exception 'Mars event type is required';
  end if;

  if p_increment is null
     or p_increment <= 0 then
    raise exception 'Mission progress increment must be positive';
  end if;


  for v_mapping in
    select
      catalog.mission_id,
      catalog.target,
      catalog.cycle_key
    from public.mars_mission_progress_catalog catalog
    where catalog.enabled = true
      and catalog.mars_event_type =
        trim(p_event_type)
    order by catalog.mission_id
  loop

    select *
    into v_existing
    from public.mission_progress progress_row
    where progress_row.builder_id =
      p_builder_id
      and progress_row.mission_id =
        v_mapping.mission_id
      and progress_row.cycle_key =
        v_mapping.cycle_key
    for update;


    if found then

      if v_existing.status in (
        'completed',
        'claimed',
        'expired',
        'locked'
      ) then
        mission_id :=
          v_mapping.mission_id;

        cycle_key :=
          v_mapping.cycle_key;

        progress :=
          v_existing.progress;

        target :=
          v_mapping.target;

        status :=
          v_existing.status;

        completed_now :=
          false;

        completed_at :=
          v_existing.completed_at;

        return next;
        continue;
      end if;


      v_progress :=
        least(
          v_mapping.target,
          v_existing.progress +
            p_increment
        );

      v_completed_now :=
        v_existing.progress <
          v_mapping.target
        and
        v_progress >=
          v_mapping.target;

      v_status :=
        case
          when v_progress >=
            v_mapping.target
            then 'completed'
          else 'active'
        end;

      v_completed_at :=
        case
          when v_completed_now
            then p_occurred_at
          else v_existing.completed_at
        end;


      update public.mission_progress
      set
        progress =
          v_progress,

        status =
          v_status,

        version =
          version + 1,

        last_event_at =
          p_occurred_at,

        completed_at =
          v_completed_at,

        updated_at =
          now()

      where id =
        v_existing.id;


    else

      v_progress :=
        least(
          v_mapping.target,
          p_increment
        );

      v_completed_now :=
        v_progress >=
          v_mapping.target;

      v_status :=
        case
          when v_completed_now
            then 'completed'
          else 'active'
        end;

      v_completed_at :=
        case
          when v_completed_now
            then p_occurred_at
          else null
        end;


      insert into public.mission_progress (
        builder_id,
        mission_id,
        cycle_key,
        status,
        progress,
        version,
        last_event_at,
        completed_at
      )
      values (
        p_builder_id,
        v_mapping.mission_id,
        v_mapping.cycle_key,
        v_status,
        v_progress,
        1,
        p_occurred_at,
        v_completed_at
      );

    end if;


    mission_id :=
      v_mapping.mission_id;

    cycle_key :=
      v_mapping.cycle_key;

    progress :=
      v_progress;

    target :=
      v_mapping.target;

    status :=
      v_status;

    completed_now :=
      v_completed_now;

    completed_at :=
      v_completed_at;

    return next;

  end loop;

  return;
end;
$$;


-- ============================================================
-- 3. Security
-- ============================================================

revoke all
on function public.record_mars_mission_progress_internal(
  uuid,
  text,
  bigint,
  timestamptz
)
from public;


revoke all
on function public.record_mars_mission_progress_internal(
  uuid,
  text,
  bigint,
  timestamptz
)
from anon;


revoke all
on function public.record_mars_mission_progress_internal(
  uuid,
  text,
  bigint,
  timestamptz
)
from authenticated;


grant execute
on function public.record_mars_mission_progress_internal(
  uuid,
  text,
  bigint,
  timestamptz
)
to service_role;


comment on function public.record_mars_mission_progress_internal(
  uuid,
  text,
  bigint,
  timestamptz
) is
  'Internal server-authoritative Mars mission progress recorder. Never executable by authenticated clients.';


-- ============================================================
-- 4. Explicitly preserve mission_progress client read-only
-- ============================================================

revoke insert, update, delete
on table public.mission_progress
from authenticated;


-- ============================================================
-- END
-- ============================================================

begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Placement Engine V1
--
-- Server-authoritative colony layout.
-- Founder / Leader / Officer may move constructed structures.
-- Browser never decides authoritative placement validity.
-- ============================================================


-- ------------------------------------------------------------
-- Building footprint catalog
-- ------------------------------------------------------------

alter table public.mars_building_definitions
  add column if not exists footprint_width integer not null default 2,
  add column if not exists footprint_depth integer not null default 2;

alter table public.mars_building_definitions
  drop constraint if exists mars_building_definitions_footprint_width_check;

alter table public.mars_building_definitions
  add constraint mars_building_definitions_footprint_width_check
  check (footprint_width between 1 and 8);

alter table public.mars_building_definitions
  drop constraint if exists mars_building_definitions_footprint_depth_check;

alter table public.mars_building_definitions
  add constraint mars_building_definitions_footprint_depth_check
  check (footprint_depth between 1 and 8);


-- Initial authoritative footprints.
-- Can be tuned later without changing frontend logic.

update public.mars_building_definitions
set
  footprint_width = case building_key
    when 'command_hub' then 4
    when 'habitat' then 3
    when 'energy' then 3
    when 'water' then 3
    when 'science_lab' then 3
    when 'food' then 3
    else footprint_width
  end,
  footprint_depth = case building_key
    when 'command_hub' then 4
    when 'habitat' then 3
    when 'energy' then 3
    when 'water' then 3
    when 'science_lab' then 3
    when 'food' then 3
    else footprint_depth
  end,
  updated_at = now();


-- ------------------------------------------------------------
-- Persistent placement state
-- ------------------------------------------------------------

alter table public.mars_colony_buildings
  add column if not exists grid_x integer,
  add column if not exists grid_z integer,
  add column if not exists rotation_y integer not null default 0;

alter table public.mars_colony_buildings
  drop constraint if exists mars_colony_buildings_rotation_y_check;

alter table public.mars_colony_buildings
  add constraint mars_colony_buildings_rotation_y_check
  check (rotation_y in (0, 90, 180, 270));


-- ------------------------------------------------------------
-- Existing constructed buildings receive deterministic
-- authoritative initial placement.
-- ------------------------------------------------------------

update public.mars_colony_buildings
set
  grid_x = case building_key
    when 'command_hub' then 0
    when 'habitat' then -6
    when 'water' then 6
    when 'science_lab' then -6
    when 'energy' then 6
    when 'food' then 0
    else 0
  end,
  grid_z = case building_key
    when 'command_hub' then 0
    when 'habitat' then -5
    when 'water' then -5
    when 'science_lab' then 5
    when 'energy' then 5
    when 'food' then 7
    else 0
  end
where grid_x is null
   or grid_z is null;


-- Origin uniqueness remains useful as an additional invariant.
create unique index if not exists
  mars_colony_buildings_grid_position_uidx
on public.mars_colony_buildings (
  colony_id,
  grid_x,
  grid_z
)
where status <> 'archived'
  and grid_x is not null
  and grid_z is not null;



-- ------------------------------------------------------------
-- Colony Base Read Model V2
--
-- Placement coordinates and effective rotated footprint are
-- returned from the server together with building state.
-- ------------------------------------------------------------

drop function if exists public.get_my_mars_colony_base();

create function public.get_my_mars_colony_base()
returns table (
  colony_id uuid,
  colony_name text,

  building_key text,
  building_name text,
  building_category text,
  building_description text,

  built boolean,
  building_level integer,
  building_status text,

  max_level integer,
  constructed_at timestamptz,

  grid_x integer,
  grid_z integer,
  rotation_y integer,

  footprint_width integer,
  footprint_depth integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_colony_name text;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select
    colony.id,
    colony.name
  into
    v_colony_id,
    v_colony_name
  from public.mars_colony_memberships membership
  join public.mars_colonies colony
    on colony.id = membership.colony_id
  where membership.builder_id = v_builder_id
    and membership.status = 'active'
    and colony.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    v_colony_id,
    v_colony_name,

    definition.building_key,
    definition.name,
    definition.category,
    definition.description,

    (building.id is not null),
    coalesce(building.level, 0),
    coalesce(building.status, 'not_built'),

    definition.max_level,
    building.constructed_at,

    building.grid_x,
    building.grid_z,
    coalesce(building.rotation_y, 0),

    case
      when coalesce(building.rotation_y, 0) in (90, 270)
        then definition.footprint_depth
      else definition.footprint_width
    end,

    case
      when coalesce(building.rotation_y, 0) in (90, 270)
        then definition.footprint_width
      else definition.footprint_depth
    end

  from public.mars_building_definitions definition

  left join public.mars_colony_buildings building
    on building.colony_id = v_colony_id
   and building.building_key = definition.building_key
   and building.status <> 'archived'

  order by definition.display_order;
end;
$$;


revoke all
on function public.get_my_mars_colony_base()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_base()
to authenticated;

comment on function public.get_my_mars_colony_base() is
'Returns authoritative Mars Colony building, level and persistent placement state.';


-- ------------------------------------------------------------
-- Placement RPC
--
-- SECURITY:
--   authenticated
--   permanent Mars access
--   active colony
--   Founder / Leader / Officer only
--
-- VALIDATION:
--   rotation
--   footprint-aware map bounds
--   footprint-aware collision
-- ------------------------------------------------------------

create or replace function public.move_my_mars_colony_building(
  p_building_key text,
  p_grid_x integer,
  p_grid_z integer,
  p_rotation_y integer default 0
)
returns table (
  building_key text,
  grid_x integer,
  grid_z integer,
  rotation_y integer,
  footprint_width integer,
  footprint_depth integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_colony_id uuid;
  v_actor_role text;

  v_building_id uuid;

  v_base_width integer;
  v_base_depth integer;

  v_width integer;
  v_depth integer;

  v_min_x integer;
  v_max_x integer;
  v_min_z integer;
  v_max_z integer;

  v_map_min integer := -12;
  v_map_max integer := 12;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  perform public.assert_my_mars_access();

  if p_building_key is null
     or char_length(trim(p_building_key)) = 0 then
    raise exception 'BUILDING_KEY_REQUIRED'
      using errcode = '22023';
  end if;

  if p_grid_x is null or p_grid_z is null then
    raise exception 'PLACEMENT_REQUIRED'
      using errcode = '22023';
  end if;

  if p_rotation_y not in (0, 90, 180, 270) then
    raise exception 'INVALID_ROTATION'
      using errcode = '22023';
  end if;


  -- Resolve authenticated Builder's active colony + role.

  select
    membership.colony_id,
    membership.role
  into
    v_colony_id,
    v_actor_role
  from public.mars_colony_memberships membership
  join public.mars_colonies colony
    on colony.id = membership.colony_id
  where membership.builder_id = v_builder_id
    and membership.status = 'active'
    and colony.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  if v_actor_role not in ('founder', 'leader', 'officer') then
    raise exception 'COLONY_BUILD_PERMISSION_REQUIRED'
      using errcode = '42501';
  end if;


  -- Lock target building and resolve its authoritative footprint.

  select
    building.id,
    definition.footprint_width,
    definition.footprint_depth
  into
    v_building_id,
    v_base_width,
    v_base_depth
  from public.mars_colony_buildings building
  join public.mars_building_definitions definition
    on definition.building_key = building.building_key
  where building.colony_id = v_colony_id
    and building.building_key = trim(p_building_key)
    and building.status <> 'archived'
  for update of building;

  if v_building_id is null then
    raise exception 'BUILDING_NOT_CONSTRUCTED'
      using errcode = 'P0002';
  end if;


  -- 90 / 270 degree rotation swaps footprint dimensions.

  if p_rotation_y in (90, 270) then
    v_width := v_base_depth;
    v_depth := v_base_width;
  else
    v_width := v_base_width;
    v_depth := v_base_depth;
  end if;


  -- Grid coordinate represents the minimum footprint cell.

  v_min_x := p_grid_x;
  v_max_x := p_grid_x + v_width - 1;

  v_min_z := p_grid_z;
  v_max_z := p_grid_z + v_depth - 1;


  -- Whole structure must remain inside the colony map.

  if v_min_x < v_map_min
     or v_max_x > v_map_max
     or v_min_z < v_map_min
     or v_max_z > v_map_max then
    raise exception 'PLACEMENT_OUT_OF_BOUNDS'
      using errcode = '22023';
  end if;


  -- Footprint-aware rectangle collision test.

  if exists (
    select 1
    from public.mars_colony_buildings occupied
    join public.mars_building_definitions occupied_definition
      on occupied_definition.building_key = occupied.building_key
    where occupied.colony_id = v_colony_id
      and occupied.id <> v_building_id
      and occupied.status <> 'archived'
      and occupied.grid_x is not null
      and occupied.grid_z is not null

      and not (
        v_max_x <
          occupied.grid_x

        or v_min_x >
          occupied.grid_x +
          (
            case
              when occupied.rotation_y in (90, 270)
                then occupied_definition.footprint_depth
              else occupied_definition.footprint_width
            end
          ) - 1

        or v_max_z <
          occupied.grid_z

        or v_min_z >
          occupied.grid_z +
          (
            case
              when occupied.rotation_y in (90, 270)
                then occupied_definition.footprint_width
              else occupied_definition.footprint_depth
            end
          ) - 1
      )
  ) then
    raise exception 'PLACEMENT_OCCUPIED'
      using errcode = '23505';
  end if;


  update public.mars_colony_buildings building
  set
    grid_x = p_grid_x,
    grid_z = p_grid_z,
    rotation_y = p_rotation_y,
    updated_at = now()
  where building.id = v_building_id;


  return query
  select
    building.building_key,
    building.grid_x,
    building.grid_z,
    building.rotation_y,

    case
      when building.rotation_y in (90, 270)
        then definition.footprint_depth
      else definition.footprint_width
    end,

    case
      when building.rotation_y in (90, 270)
        then definition.footprint_width
      else definition.footprint_depth
    end,

    building.updated_at
  from public.mars_colony_buildings building
  join public.mars_building_definitions definition
    on definition.building_key = building.building_key
  where building.id = v_building_id;
end;
$$;


revoke all
on function public.move_my_mars_colony_building(
  text,
  integer,
  integer,
  integer
)
from public, anon;

grant execute
on function public.move_my_mars_colony_building(
  text,
  integer,
  integer,
  integer
)
to authenticated;


comment on function public.move_my_mars_colony_building(
  text,
  integer,
  integer,
  integer
) is
'Server-authoritative footprint-aware BOBU Mars colony building placement RPC.';


comment on column public.mars_building_definitions.footprint_width is
'Authoritative unrotated colony grid footprint width.';

comment on column public.mars_building_definitions.footprint_depth is
'Authoritative unrotated colony grid footprint depth.';


commit;

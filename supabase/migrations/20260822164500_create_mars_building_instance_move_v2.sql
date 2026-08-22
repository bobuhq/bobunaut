
begin;

drop function if exists public.move_my_mars_colony_building(
  text,
  integer,
  integer,
  integer
);

create or replace function public.move_my_mars_colony_building(
  p_building_id uuid,
  p_grid_x integer,
  p_grid_z integer,
  p_rotation_y integer default 0
)
returns table (
  building_id uuid,
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

  v_building_key text;

  v_base_width integer;
  v_base_depth integer;

  v_width integer;
  v_depth integer;

  v_min_x integer;
  v_max_x integer;
  v_min_z integer;
  v_max_z integer;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  perform public.assert_my_mars_access();

  if p_building_id is null then
    raise exception 'BUILDING_ID_REQUIRED'
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


  -- Active Colony + management permission.

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

  if v_actor_role not in (
    'founder',
    'leader',
    'officer'
  ) then
    raise exception 'COLONY_BUILD_PERMISSION_REQUIRED'
      using errcode = '42501';
  end if;


  -- Resolve EXACT physical building instance.

  select
    building.building_key,
    definition.footprint_width,
    definition.footprint_depth
  into
    v_building_key,
    v_base_width,
    v_base_depth
  from public.mars_colony_buildings building
  join public.mars_building_definitions definition
    on definition.building_key =
       building.building_key
  where building.id = p_building_id
    and building.colony_id = v_colony_id
    and building.status <> 'archived'
  for update of building;

  if v_building_key is null then
    raise exception 'BUILDING_NOT_CONSTRUCTED'
      using errcode = 'P0002';
  end if;


  if p_rotation_y in (90, 270) then
    v_width := v_base_depth;
    v_depth := v_base_width;
  else
    v_width := v_base_width;
    v_depth := v_base_depth;
  end if;


  v_min_x := p_grid_x;
  v_max_x := p_grid_x + v_width - 1;

  v_min_z := p_grid_z;
  v_max_z := p_grid_z + v_depth - 1;


  if v_min_x < -12
     or v_max_x > 12
     or v_min_z < -12
     or v_max_z > 12 then
    raise exception 'PLACEMENT_OUT_OF_BOUNDS'
      using errcode = '22023';
  end if;


  -- Collision against every OTHER physical instance.

  if exists (
    select 1
    from public.mars_colony_buildings occupied
    join public.mars_building_definitions occupied_definition
      on occupied_definition.building_key =
         occupied.building_key
    where occupied.colony_id = v_colony_id
      and occupied.id <> p_building_id
      and occupied.status <> 'archived'
      and occupied.grid_x is not null
      and occupied.grid_z is not null

      and not (
        v_max_x < occupied.grid_x

        or v_min_x >
          occupied.grid_x +
          (
            case
              when occupied.rotation_y in (90, 270)
                then occupied_definition.footprint_depth
              else occupied_definition.footprint_width
            end
          ) - 1

        or v_max_z < occupied.grid_z

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
  where building.id = p_building_id
    and building.colony_id = v_colony_id;


  return query
  select
    building.id,
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
    on definition.building_key =
       building.building_key

  where building.id = p_building_id
    and building.colony_id = v_colony_id;
end;
$$;


revoke all
on function public.move_my_mars_colony_building(
  uuid,
  integer,
  integer,
  integer
)
from public, anon;

grant execute
on function public.move_my_mars_colony_building(
  uuid,
  integer,
  integer,
  integer
)
to authenticated;

comment on function public.move_my_mars_colony_building(
  uuid,
  integer,
  integer,
  integer
) is
'Moves one exact physical Mars Colony building instance by building_id.';

commit;

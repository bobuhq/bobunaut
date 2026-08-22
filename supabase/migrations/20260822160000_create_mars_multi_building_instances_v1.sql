begin;

-- ============================================================
-- BOBU MARS
-- Multi-Building Instance Engine V1
--
-- PURPOSE
--   Allow multiple physical instances of the same building type
--   inside one Colony.
--
-- RULES
--   * mars_colony_buildings.id = physical instance identity
--   * building_key = building type / definition identity
--   * Command Hub remains singleton per Colony
--   * Market buildings may have multiple instances
--   * Placement remains server authoritative
--   * Existing buildings and coordinates are preserved
-- ============================================================


-- ------------------------------------------------------------
-- 1. Remove legacy "one building type per Colony" constraint.
-- ------------------------------------------------------------

alter table public.mars_colony_buildings
drop constraint if exists
mars_colony_buildings_colony_id_building_key_key;


-- ------------------------------------------------------------
-- 2. Keep Command Hub singleton.
-- ------------------------------------------------------------

create unique index if not exists
mars_colony_buildings_one_command_hub_per_colony_idx
on public.mars_colony_buildings (colony_id)
where building_key = 'command_hub'
  and status <> 'archived';


-- ------------------------------------------------------------
-- 3. Useful instance lookup indexes.
-- ------------------------------------------------------------

create index if not exists
mars_colony_buildings_colony_instance_idx
on public.mars_colony_buildings (
  colony_id,
  building_key,
  status
);

create index if not exists
mars_colony_buildings_colony_placement_idx
on public.mars_colony_buildings (
  colony_id,
  grid_x,
  grid_z
)
where status <> 'archived';


-- ------------------------------------------------------------
-- 4. Replace inventory placement RPC.
--
-- IMPORTANT:
-- No duplicate building_key rejection.
-- Every placement creates a NEW physical building instance.
-- ------------------------------------------------------------

create or replace function
public.place_my_mars_inventory_building(
  p_item_key text,
  p_grid_x integer,
  p_grid_z integer,
  p_rotation_y integer default 0
)
returns table (
  building_id uuid,
  colony_id uuid,
  building_key text,
  building_name text,
  building_level integer,
  building_status text,
  grid_x integer,
  grid_z integer,
  rotation_y integer,
  footprint_width integer,
  footprint_depth integer,
  inventory_quantity integer,
  placed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();

  v_item_key text := trim(coalesce(p_item_key, ''));

  v_colony_id uuid;
  v_role text;

  v_inventory_id uuid;
  v_inventory_quantity integer;

  v_building_id uuid := gen_random_uuid();
  v_building_key text;
  v_building_name text;

  v_base_width integer;
  v_base_depth integer;

  v_width integer;
  v_depth integer;

  v_min_x integer;
  v_max_x integer;
  v_min_z integer;
  v_max_z integer;

  v_map_min constant integer := -12;
  v_map_max constant integer := 12;

  v_now timestamptz := now();
begin

  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  perform public.assert_my_mars_access();

  if char_length(v_item_key) = 0 then
    raise exception 'MARKET_ITEM_REQUIRED'
      using errcode = '22023';
  end if;

  if p_grid_x is null or p_grid_z is null then
    raise exception 'PLACEMENT_COORDINATES_REQUIRED'
      using errcode = '22023';
  end if;

  if p_rotation_y not in (0, 90, 180, 270) then
    raise exception 'INVALID_ROTATION'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Active Colony + management permission.
  -- ----------------------------------------------------------

  select
    membership.colony_id,
    membership.role
  into
    v_colony_id,
    v_role
  from public.mars_colony_memberships membership
  join public.mars_colonies colony
    on colony.id = membership.colony_id
  where membership.builder_id = v_builder_id
    and membership.status = 'active'
    and colony.status = 'active'
  limit 1
  for update of colony;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  if v_role not in ('founder', 'leader', 'officer') then
    raise exception 'COLONY_BUILD_PERMISSION_REQUIRED'
      using errcode = '42501';
  end if;


  -- ----------------------------------------------------------
  -- Lock one persistent inventory record.
  -- ----------------------------------------------------------

  select
    inventory.id,
    inventory.quantity,
    market.building_key
  into
    v_inventory_id,
    v_inventory_quantity,
    v_building_key
  from public.mars_colony_inventory inventory
  join public.mars_market_catalog market
    on market.item_key = inventory.item_key
  where inventory.colony_id = v_colony_id
    and inventory.item_key = v_item_key
    and inventory.quantity > 0
    and market.active = true
    and market.item_type = 'building'
    and market.building_key is not null
  for update of inventory;

  if v_inventory_id is null then
    raise exception 'BUILDING_NOT_IN_INVENTORY'
      using errcode = 'P0002';
  end if;


  -- ----------------------------------------------------------
  -- Authoritative building definition.
  -- ----------------------------------------------------------

  select
    definition.name,
    definition.footprint_width,
    definition.footprint_depth
  into
    v_building_name,
    v_base_width,
    v_base_depth
  from public.mars_building_definitions definition
  where definition.building_key = v_building_key;

  if v_building_name is null then
    raise exception 'BUILDING_NOT_FOUND'
      using errcode = '22023';
  end if;

  -- Command Hub is Colony core infrastructure and cannot
  -- be instantiated through Market inventory.
  if v_building_key = 'command_hub' then
    raise exception 'COMMAND_HUB_ALREADY_CORE'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Rotated footprint.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Colony map bounds.
  -- ----------------------------------------------------------

  if v_min_x < v_map_min
     or v_max_x > v_map_max
     or v_min_z < v_map_min
     or v_max_z > v_map_max then
    raise exception 'PLACEMENT_OUT_OF_BOUNDS'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Collision against ALL existing physical instances.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.mars_colony_buildings occupied
    join public.mars_building_definitions occupied_definition
      on occupied_definition.building_key =
         occupied.building_key
    where occupied.colony_id = v_colony_id
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


  -- ----------------------------------------------------------
  -- NEW physical instance.
  --
  -- No resource debit:
  -- Market purchase already paid for this building.
  -- ----------------------------------------------------------

  insert into public.mars_colony_buildings (
    id,
    colony_id,
    building_key,
    level,
    status,
    constructed_at,
    grid_x,
    grid_z,
    rotation_y,
    created_at,
    updated_at
  )
  values (
    v_building_id,
    v_colony_id,
    v_building_key,
    1,
    'active',
    v_now,
    p_grid_x,
    p_grid_z,
    p_rotation_y,
    v_now,
    v_now
  );


  -- ----------------------------------------------------------
  -- Consume exactly ONE purchased inventory unit.
  -- ----------------------------------------------------------

  update public.mars_colony_inventory inventory
  set
    quantity = inventory.quantity - 1,
    updated_at = v_now
  where inventory.id = v_inventory_id
  returning inventory.quantity
  into v_inventory_quantity;


  -- ----------------------------------------------------------
  -- Permanent Colony history.
  -- ----------------------------------------------------------

  insert into public.mars_colony_history (
    colony_id,
    event_type,
    event_key,
    actor_builder_id,
    subject_builder_id,
    title,
    description,
    metadata,
    created_at
  )
  values (
    v_colony_id,
    'building_placed',
    'building_placed:' || v_building_id::text,
    v_builder_id,
    v_builder_id,
    'Mars Building Placed',
    v_building_name ||
      ' placed from Colony inventory.',
    jsonb_build_object(
      'item_key', v_item_key,
      'building_id', v_building_id,
      'building_key', v_building_key,
      'building_name', v_building_name,
      'building_level', 1,
      'grid_x', p_grid_x,
      'grid_z', p_grid_z,
      'rotation_y', p_rotation_y,
      'footprint_width', v_width,
      'footprint_depth', v_depth,
      'inventory_quantity', v_inventory_quantity,
      'resource_debit', false,
      'source', 'mars_market_inventory'
    ),
    v_now
  );


  return query
  select
    v_building_id,
    v_colony_id,
    v_building_key,
    v_building_name,
    1,
    'active'::text,
    p_grid_x,
    p_grid_z,
    p_rotation_y,
    v_width,
    v_depth,
    v_inventory_quantity,
    v_now;
end;
$$;


revoke all
on function public.place_my_mars_inventory_building(
  text,
  integer,
  integer,
  integer
)
from public, anon;


grant execute
on function public.place_my_mars_inventory_building(
  text,
  integer,
  integer,
  integer
)
to authenticated;


comment on function
public.place_my_mars_inventory_building(
  text,
  integer,
  integer,
  integer
) is
'Creates a new physical Mars building instance from purchased Colony inventory. Multiple instances of the same building type are supported. Placement and collision validation remain server authoritative.';


-- ============================================================
-- Colony Base read model now upgrades inside the SAME
-- transaction as the multi-instance write model.
-- ============================================================

drop function if exists public.get_my_mars_colony_base();

create function public.get_my_mars_colony_base()
returns table (
  colony_id uuid,
  colony_name text,

  building_id uuid,

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

  -- ----------------------------------------------------------
  -- A. Every persistent physical building instance.
  -- ----------------------------------------------------------

  select
    v_colony_id,
    v_colony_name,

    building.id,

    definition.building_key,
    definition.name,
    definition.category,
    definition.description,

    true,
    building.level,
    building.status,

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

  from public.mars_colony_buildings building

  join public.mars_building_definitions definition
    on definition.building_key =
       building.building_key

  where building.colony_id = v_colony_id
    and building.status <> 'archived'


  union all


  -- ----------------------------------------------------------
  -- B. Catalog definitions not yet represented in the Colony.
  --
  -- These preserve the existing construction/catalog UI.
  -- They are NOT physical building instances.
  -- building_id therefore remains NULL.
  -- ----------------------------------------------------------

  select
    v_colony_id,
    v_colony_name,

    null::uuid,

    definition.building_key,
    definition.name,
    definition.category,
    definition.description,

    false,
    0,
    'not_built'::text,

    definition.max_level,
    null::timestamptz,

    null::integer,
    null::integer,
    0,

    definition.footprint_width,
    definition.footprint_depth

  from public.mars_building_definitions definition

  where not exists (
    select 1
    from public.mars_colony_buildings building
    where building.colony_id = v_colony_id
      and building.building_key =
          definition.building_key
      and building.status <> 'archived'
  )

  order by 4, 8 desc, 12;
end;
$$;


revoke all
on function public.get_my_mars_colony_base()
from public, anon;

grant execute
on function public.get_my_mars_colony_base()
to authenticated;


comment on function public.get_my_mars_colony_base() is
'Returns every persistent physical Mars building instance with building_id while preserving not-built catalog definitions for the Colony construction UI.';


commit;

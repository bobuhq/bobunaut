begin;

-- ============================================================
-- BOBU MARS
-- INVENTORY -> PLACE -> COLONY BUILDING
--
-- Market purchase already paid the full resource cost.
-- This RPC MUST NOT debit Colony resources again.
-- ============================================================

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
#variable_conflict use_column
declare
  v_builder_id uuid := auth.uid();

  v_colony_id uuid;
  v_role text;

  v_item_key text :=
    trim(coalesce(p_item_key, ''));

  v_building_key text;
  v_building_name text;

  v_inventory_id uuid;
  v_inventory_quantity integer;

  v_building_id uuid :=
    gen_random_uuid();

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

  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

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
  -- Resolve active Colony and permission
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
  -- Lock inventory item.
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
  -- Resolve authoritative building definition.
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

  if v_building_key = 'command_hub' then
    raise exception 'COMMAND_HUB_ALREADY_CORE'
      using errcode = '22023';
  end if;


  -- Current building architecture is unique-per-colony.

  if exists (
    select 1
    from public.mars_colony_buildings building
    where building.colony_id = v_colony_id
      and building.building_key = v_building_key
      and building.status <> 'archived'
  ) then
    raise exception 'BUILDING_ALREADY_CONSTRUCTED'
      using errcode = '23505';
  end if;


  -- ----------------------------------------------------------
  -- Resolve rotated footprint.
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
  -- Map boundary validation.
  -- ----------------------------------------------------------

  if v_min_x < v_map_min
     or v_max_x > v_map_max
     or v_min_z < v_map_min
     or v_max_z > v_map_max then
    raise exception 'PLACEMENT_OUT_OF_BOUNDS'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Footprint-aware collision validation.
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
  -- Construct building.
  --
  -- IMPORTANT:
  -- NO RESOURCE DEBIT HERE.
  -- Purchase price was already paid in Mars Market.
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
  -- Consume exactly one inventory item.
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
    'building_placed:' ||
      v_building_id::text,
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


  -- ----------------------------------------------------------
  -- Return authoritative result.
  -- ----------------------------------------------------------

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
'Atomically consumes one purchased Mars building from persistent Colony inventory and places it into the Colony using server-authoritative footprint collision validation. No Colony resources are charged because the building was paid for at Market purchase.';


commit;

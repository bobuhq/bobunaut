begin;

CREATE OR REPLACE FUNCTION public.upgrade_my_mars_colony_building(p_building_key text)
 RETURNS TABLE(building_id uuid, colony_id uuid, colony_name text, building_key text, building_name text, previous_level integer, new_level integer, materials_remaining bigint, energy_remaining bigint, water_remaining bigint, science_remaining bigint, food_remaining bigint, upgraded_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  v_builder_id uuid := auth.uid();

  v_colony_id uuid;
  v_colony_name text;
  v_role text;

  v_building_id uuid;
  v_building_name text;
  v_current_level integer;
  v_max_level integer;

  v_command_hub_level integer;
  v_max_other_building_level integer;

  v_materials bigint;
  v_energy bigint;
  v_water bigint;
  v_science bigint;
  v_food bigint;

  v_materials_remaining bigint;
  v_energy_remaining bigint;
  v_water_remaining bigint;
  v_science_remaining bigint;
  v_food_remaining bigint;

  v_upgrade_at timestamptz := now();
  v_source_reference text;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select
    c.id,
    c.name,
    m.role
  into
    v_colony_id,
    v_colony_name,
    v_role
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = v_builder_id
    and m.status = 'active'
    and c.status = 'active'
  limit 1
  for update of c;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  if v_role not in ('founder', 'leader') then
    raise exception 'COLONY_CONTROL_REQUIRED'
      using errcode = '42501';
  end if;

  select
    b.id,
    d.name,
    b.level,
    d.max_level
  into
    v_building_id,
    v_building_name,
    v_current_level,
    v_max_level
  from public.mars_colony_buildings b
  join public.mars_building_definitions d
    on d.building_key = b.building_key
  where b.colony_id = v_colony_id
    and b.building_key = trim(p_building_key)
    and b.status = 'active'
  limit 1
  for update of b;

  if v_building_id is null then
    raise exception 'ACTIVE_BUILDING_REQUIRED'
      using errcode = '22023';
  end if;

  if v_current_level >= v_max_level then
    raise exception 'BUILDING_MAX_LEVEL'
      using errcode = '22023';
  end if;

  select
    progression.command_hub_level,
    progression.max_other_building_level
  into
    v_command_hub_level,
    v_max_other_building_level
  from public.get_mars_command_hub_progression_for_colony(
    v_colony_id
  ) progression;

  if trim(p_building_key) <> 'command_hub'
     and (v_current_level + 1) > v_max_other_building_level then
    raise exception 'COMMAND_HUB_LEVEL_REQUIRED'
      using
        errcode = '22023',
        detail =
          'Command Hub Level ' ||
          (v_current_level + 1)::text ||
          ' is required before this building can be upgraded.';
  end if;

  select
    cost.materials,
    cost.energy,
    cost.water,
    cost.science,
    cost.food
  into
    v_materials,
    v_energy,
    v_water,
    v_science,
    v_food
  from public.mars_building_upgrade_costs cost
  where cost.building_key = trim(p_building_key)
    and cost.from_level = v_current_level;

  if not found then
    raise exception 'UPGRADE_COST_NOT_CONFIGURED'
      using errcode = '22023';
  end if;

  v_source_reference :=
    'building-upgrade:' ||
    v_building_id::text ||
    ':level:' ||
    (v_current_level + 1)::text;

  if v_materials > 0 then
    select new_balance
    into v_materials_remaining
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'materials',
      v_materials,
      'building_upgrade',
      v_source_reference || ':materials',
      v_builder_id,
      jsonb_build_object(
        'building_key', p_building_key,
        'from_level', v_current_level,
        'to_level', v_current_level + 1
      )
    );
  else
    select materials
    into v_materials_remaining
    from public.mars_colony_resources
    where colony_id = v_colony_id;
  end if;

  if v_energy > 0 then
    select new_balance
    into v_energy_remaining
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'energy',
      v_energy,
      'building_upgrade',
      v_source_reference || ':energy',
      v_builder_id,
      '{}'::jsonb
    );
  else
    select energy
    into v_energy_remaining
    from public.mars_colony_resources
    where colony_id = v_colony_id;
  end if;

  if v_water > 0 then
    select new_balance
    into v_water_remaining
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'water',
      v_water,
      'building_upgrade',
      v_source_reference || ':water',
      v_builder_id,
      '{}'::jsonb
    );
  else
    select water
    into v_water_remaining
    from public.mars_colony_resources
    where colony_id = v_colony_id;
  end if;

  if v_science > 0 then
    select new_balance
    into v_science_remaining
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'science',
      v_science,
      'building_upgrade',
      v_source_reference || ':science',
      v_builder_id,
      '{}'::jsonb
    );
  else
    select science
    into v_science_remaining
    from public.mars_colony_resources
    where colony_id = v_colony_id;
  end if;

  if v_food > 0 then
    select new_balance
    into v_food_remaining
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'food',
      v_food,
      'building_upgrade',
      v_source_reference || ':food',
      v_builder_id,
      '{}'::jsonb
    );
  else
    select food
    into v_food_remaining
    from public.mars_colony_resources
    where colony_id = v_colony_id;
  end if;

  update public.mars_colony_buildings
  set
    level = v_current_level + 1,
    updated_at = v_upgrade_at
  where id = v_building_id;

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
    'BUILDING_UPGRADED',
    v_source_reference,
    v_builder_id,
    v_builder_id,
    'Colony Building Upgraded',
    v_building_name || ' upgraded to Level ' ||
      (v_current_level + 1)::text || '.',
    jsonb_build_object(
      'building_id', v_building_id,
      'building_key', p_building_key,
      'previous_level', v_current_level,
      'new_level', v_current_level + 1,
      'materials_cost', v_materials,
      'energy_cost', v_energy,
      'water_cost', v_water,
      'science_cost', v_science,
      'food_cost', v_food
    ),
    v_upgrade_at
  );

  -- Civilization contribution.
  perform *
  from public.record_mars_contribution_internal(
    v_builder_id,
    'colony',
    v_source_reference,
    case trim(p_building_key)
      when 'habitat' then 'habitats'
      when 'energy' then 'energy'
      when 'water' then 'water'
      when 'science_lab' then 'science'
      else 'general'
    end,
    (50 * (v_current_level + 1))::bigint,
    jsonb_build_object(
      'building_id', v_building_id,
      'building_key', trim(p_building_key),
      'building_name', v_building_name,
      'previous_level', v_current_level,
      'new_level', v_current_level + 1
    )
  );

  -- Mars Mission Progress.
  perform *
  from public.record_mars_mission_progress_internal(
    v_builder_id,
    'BUILDING_UPGRADED',
    1,
    now()
  );

  return query
  select
    v_building_id,
    v_colony_id,
    v_colony_name,
    trim(p_building_key),
    v_building_name,
    v_current_level,
    v_current_level + 1,
    v_materials_remaining,
    v_energy_remaining,
    v_water_remaining,
    v_science_remaining,
    v_food_remaining,
    v_upgrade_at;
end;
$function$;

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

  v_map_min integer;
  v_map_max integer;
  v_command_hub_level integer;

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
  select
    progression.command_hub_level,
    progression.map_min,
    progression.map_max
  into
    v_command_hub_level,
    v_map_min,
    v_map_max
  from public.get_mars_command_hub_progression_for_colony(
    v_colony_id
  ) progression;

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
      using
        errcode = '22023',
        detail =
          'Command Hub Level ' ||
          v_command_hub_level::text ||
          ' currently unlocks grid ' ||
          v_map_min::text ||
          ' through ' ||
          v_map_max::text ||
          '.';
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

  v_command_hub_level integer;
  v_map_min integer;
  v_map_max integer;
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


  select
    progression.command_hub_level,
    progression.map_min,
    progression.map_max
  into
    v_command_hub_level,
    v_map_min,
    v_map_max
  from public.get_mars_command_hub_progression_for_colony(
    v_colony_id
  ) progression;

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


  if v_min_x < v_map_min
     or v_max_x > v_map_max
     or v_min_z < v_map_min
     or v_max_z > v_map_max then
    raise exception 'PLACEMENT_OUT_OF_BOUNDS'
      using
        errcode = '22023',
        detail =
          'Command Hub Level ' ||
          v_command_hub_level::text ||
          ' currently unlocks grid ' ||
          v_map_min::text ||
          ' through ' ||
          v_map_max::text ||
          '.';
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

comment on function public.upgrade_my_mars_colony_building(text) is
'Server-authoritative Mars building upgrade. Non-Command-Hub structures cannot exceed the active Command Hub level.';

comment on function public.place_my_mars_inventory_building(
  text,
  integer,
  integer,
  integer
) is
'Places a purchased Mars building inside territory unlocked by the active Command Hub level.';

comment on function public.move_my_mars_colony_building(
  uuid,
  integer,
  integer,
  integer
) is
'Moves one physical Mars building instance inside territory unlocked by the active Command Hub level.';

commit;

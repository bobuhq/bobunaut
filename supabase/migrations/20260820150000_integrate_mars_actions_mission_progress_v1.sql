-- ============================================================
-- BOBU Universe
-- Mars Action -> Mission Progress Integration v1
--
-- Server-authoritative mission progress events:
--   colony_created
--   sector_assigned
--   building_constructed
--   building_upgraded
--   resources_claimed
--
-- Mission progress is recorded only after the underlying Mars
-- mutation succeeds and before the RPC returns.
-- ============================================================

begin;

CREATE OR REPLACE FUNCTION public.create_my_mars_colony(p_name text, p_specialization text DEFAULT 'general'::text)
 RETURNS TABLE(colony_id uuid, colony_code text, colony_name text, specialization text, colony_status text, member_count bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_builder_id uuid := auth.uid();
  v_name text;
  v_specialization text;
  v_colony_id uuid;
  v_colony_code text;
  v_created_at timestamptz;
begin
  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    where bp.builder_id = v_builder_id
  ) then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = '42501';
  end if;


  -- ----------------------------------------------------------
  -- Input normalization / validation
  -- ----------------------------------------------------------

  v_name := trim(coalesce(p_name, ''));

  if char_length(v_name) < 3
     or char_length(v_name) > 40
  then
    raise exception 'INVALID_COLONY_NAME'
      using errcode = '22023';
  end if;

  if v_name !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,38}[A-Za-z0-9]$'
  then
    raise exception 'INVALID_COLONY_NAME_FORMAT'
      using errcode = '22023';
  end if;

  v_specialization :=
    lower(trim(coalesce(p_specialization, 'general')));

  if v_specialization not in (
    'general',
    'mining',
    'exploration',
    'science',
    'architecture',
    'guardian',
    'command'
  ) then
    raise exception 'INVALID_COLONY_SPECIALIZATION'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- One active Colony per Builder
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.mars_colony_memberships m
    where m.builder_id = v_builder_id
      and m.status = 'active'
  ) then
    raise exception 'ACTIVE_COLONY_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  -- ----------------------------------------------------------
  -- Case-insensitive Colony name uniqueness
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.mars_colonies c
    where lower(c.name) = lower(v_name)
      and c.status <> 'archived'
  ) then
    raise exception 'COLONY_NAME_ALREADY_EXISTS'
      using errcode = '23505';
  end if;


  -- ----------------------------------------------------------
  -- Generate immutable Colony identity
  -- ----------------------------------------------------------

  v_colony_id := gen_random_uuid();

  v_colony_code :=
    'CLY-' ||
    upper(
      substr(
        replace(v_colony_id::text, '-', ''),
        1,
        12
      )
    );

  v_created_at := now();


  -- ----------------------------------------------------------
  -- Create Colony
  -- ----------------------------------------------------------

  insert into public.mars_colonies (
    id,
    colony_code,
    name,
    founder_builder_id,
    leader_builder_id,
    specialization,
    status,
    member_count,
    total_contribution,
    created_at,
    updated_at
  )
  values (
    v_colony_id,
    v_colony_code,
    v_name,
    v_builder_id,
    v_builder_id,
    v_specialization,
    'active',
    1,
    0,
    v_created_at,
    v_created_at
  );


  -- ----------------------------------------------------------
  -- Founder becomes first active member.
  -- ----------------------------------------------------------

  insert into public.mars_colony_memberships (
    colony_id,
    builder_id,
    role,
    status,
    joined_at,
    created_at,
    updated_at
  )
  values (
    v_colony_id,
    v_builder_id,
    'founder',
    'active',
    v_created_at,
    v_created_at,
    v_created_at
  );


  -- ----------------------------------------------------------
  -- Immutable Colony history
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
    'COLONY_CREATED',
    'COLONY_CREATED',
    v_builder_id,
    v_builder_id,
    'Colony Founded',
    v_name || ' was founded on Mars.',
    jsonb_build_object(
      'colony_code', v_colony_code,
      'specialization', v_specialization
    ),
    v_created_at
  );


  -- ----------------------------------------------------------
  -- Return safe public result.
  -- ----------------------------------------------------------

  -- Mars Mission Progress.
  perform *
  from public.record_mars_mission_progress_internal(
    v_builder_id,
    'COLONY_CREATED',
    1,
    now()
  );

  return query
  select
    c.id,
    c.colony_code,
    c.name,
    c.specialization,
    c.status,
    c.member_count,
    c.created_at
  from public.mars_colonies c
  where c.id = v_colony_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_my_colony_to_mars_sector(p_sector_id uuid)
 RETURNS TABLE(assignment_id uuid, colony_id uuid, colony_name text, sector_id uuid, sector_name text, assignment_status text, assigned_at timestamp with time zone, sector_current_colonies bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor_builder_id uuid := auth.uid();

  v_colony_id uuid;
  v_colony_name text;

  v_sector_name text;
  v_sector_status text;
  v_sector_max_colonies bigint;
  v_sector_current_colonies bigint;

  v_assignment_id uuid;
  v_assigned_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_sector_id is null then
    raise exception 'SECTOR_REQUIRED'
      using errcode = '22023';
  end if;

  select
    c.id,
    c.name
  into
    v_colony_id,
    v_colony_name
  from public.mars_colonies c
  where c.leader_builder_id = v_actor_builder_id
    and c.status = 'active'
  limit 1
  for update;

  if v_colony_id is null then
    raise exception 'COLONY_LEADER_REQUIRED'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.mars_colony_sector_assignments assignment
    where assignment.colony_id = v_colony_id
      and assignment.status = 'active'
  ) then
    raise exception 'ACTIVE_SECTOR_ALREADY_ASSIGNED'
      using errcode = '23505';
  end if;

  select
    sector.name,
    sector.status,
    sector.max_colonies,
    sector.current_colonies
  into
    v_sector_name,
    v_sector_status,
    v_sector_max_colonies,
    v_sector_current_colonies
  from public.mars_sectors sector
  where sector.id = p_sector_id
  for update;

  if v_sector_name is null then
    raise exception 'SECTOR_NOT_FOUND'
      using errcode = '22023';
  end if;

  if v_sector_status <> 'active' then
    raise exception 'SECTOR_NOT_AVAILABLE'
      using errcode = '22023';
  end if;

  if v_sector_current_colonies >= v_sector_max_colonies then
    raise exception 'SECTOR_CAPACITY_REACHED'
      using errcode = '23505';
  end if;

  insert into public.mars_colony_sector_assignments (
    colony_id,
    sector_id,
    status,
    assigned_at,
    created_at,
    updated_at
  )
  values (
    v_colony_id,
    p_sector_id,
    'active',
    v_assigned_at,
    v_assigned_at,
    v_assigned_at
  )
  returning id
  into v_assignment_id;

  update public.mars_sectors as sector
  set
    current_colonies = sector.current_colonies + 1,
    updated_at = v_assigned_at
  where sector.id = p_sector_id
  returning sector.current_colonies
  into v_sector_current_colonies;

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
    'SECTOR_ASSIGNED',
    'sector_assigned:' || v_assignment_id::text,
    v_actor_builder_id,
    v_actor_builder_id,
    'Colony Assigned to Mars Sector',
    v_colony_name || ' established operations in ' ||
      v_sector_name || '.',
    jsonb_build_object(
      'assignment_id', v_assignment_id,
      'sector_id', p_sector_id,
      'sector_name', v_sector_name
    ),
    v_assigned_at
  );

  -- Mars Mission Progress.
  perform *
  from public.record_mars_mission_progress_internal(
    v_actor_builder_id,
    'SECTOR_ASSIGNED',
    1,
    now()
  );

  return query
  select
    v_assignment_id,
    v_colony_id,
    v_colony_name,
    p_sector_id,
    v_sector_name,
    'active'::text,
    v_assigned_at,
    v_sector_current_colonies;
end;
$function$;

CREATE OR REPLACE FUNCTION public.construct_my_mars_colony_building(p_building_key text)
 RETURNS TABLE(building_id uuid, colony_id uuid, colony_name text, building_key text, building_name text, building_level integer, building_status text, constructed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_column
declare
  v_actor_builder_id uuid := auth.uid();

  v_colony_id uuid;
  v_colony_name text;
  v_role text;

  v_building_key text :=
    trim(coalesce(p_building_key, ''));

  v_building_name text;
  v_building_id uuid;
  v_constructed_at timestamptz := now();

  v_materials bigint;
  v_energy bigint;
  v_water bigint;
  v_science bigint;
  v_food bigint;

  v_source_reference text;
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if char_length(v_building_key) = 0 then
    raise exception 'BUILDING_REQUIRED'
      using errcode = '22023';
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
  where m.builder_id = v_actor_builder_id
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

  if v_building_key = 'command_hub' then
    raise exception 'COMMAND_HUB_ALREADY_CORE'
      using errcode = '22023';
  end if;

  select definition.name
  into v_building_name
  from public.mars_building_definitions definition
  where definition.building_key = v_building_key;

  if v_building_name is null then
    raise exception 'BUILDING_NOT_FOUND'
      using errcode = '22023';
  end if;

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
  from public.mars_building_construction_costs cost
  where cost.building_key = v_building_key;

  if not found then
    raise exception 'CONSTRUCTION_COST_NOT_CONFIGURED'
      using errcode = '22023';
  end if;

  v_source_reference :=
    'building-construction:' ||
    v_colony_id::text ||
    ':' ||
    v_building_key;

  if v_materials > 0 then
    perform *
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'materials',
      v_materials,
      'building_construction',
      v_source_reference || ':materials',
      v_actor_builder_id,
      jsonb_build_object(
        'building_key', v_building_key,
        'building_name', v_building_name,
        'construction_level', 1
      )
    );
  end if;

  if v_energy > 0 then
    perform *
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'energy',
      v_energy,
      'building_construction',
      v_source_reference || ':energy',
      v_actor_builder_id,
      jsonb_build_object(
        'building_key', v_building_key,
        'building_name', v_building_name,
        'construction_level', 1
      )
    );
  end if;

  if v_water > 0 then
    perform *
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'water',
      v_water,
      'building_construction',
      v_source_reference || ':water',
      v_actor_builder_id,
      jsonb_build_object(
        'building_key', v_building_key,
        'building_name', v_building_name,
        'construction_level', 1
      )
    );
  end if;

  if v_science > 0 then
    perform *
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'science',
      v_science,
      'building_construction',
      v_source_reference || ':science',
      v_actor_builder_id,
      jsonb_build_object(
        'building_key', v_building_key,
        'building_name', v_building_name,
        'construction_level', 1
      )
    );
  end if;

  if v_food > 0 then
    perform *
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'food',
      v_food,
      'building_construction',
      v_source_reference || ':food',
      v_actor_builder_id,
      jsonb_build_object(
        'building_key', v_building_key,
        'building_name', v_building_name,
        'construction_level', 1
      )
    );
  end if;

  insert into public.mars_colony_buildings (
    colony_id,
    building_key,
    level,
    status,
    constructed_at,
    updated_at
  )
  values (
    v_colony_id,
    v_building_key,
    1,
    'active',
    v_constructed_at,
    v_constructed_at
  )
  returning id
  into v_building_id;

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
    'BUILDING_CONSTRUCTED',
    'building_constructed:' || v_building_id::text,
    v_actor_builder_id,
    v_actor_builder_id,
    'Colony Building Constructed',
    v_building_name ||
      ' constructed in ' ||
      v_colony_name ||
      '.',
    jsonb_build_object(
      'building_id', v_building_id,
      'building_key', v_building_key,
      'building_name', v_building_name,
      'level', 1,
      'materials_cost', v_materials,
      'energy_cost', v_energy,
      'water_cost', v_water,
      'science_cost', v_science,
      'food_cost', v_food
    ),
    v_constructed_at
  );

  -- Civilization contribution.
  perform *
  from public.record_mars_contribution_internal(
    v_actor_builder_id,
    'colony',
    v_source_reference,
    case v_building_key
      when 'habitat' then 'habitats'
      when 'energy' then 'energy'
      when 'water' then 'water'
      when 'science_lab' then 'science'
      else 'general'
    end,
    100,
    jsonb_build_object(
      'building_id', v_building_id,
      'building_key', v_building_key,
      'building_name', v_building_name,
      'building_level', 1
    )
  );

  -- Mars Mission Progress.
  perform *
  from public.record_mars_mission_progress_internal(
    v_actor_builder_id,
    'BUILDING_CONSTRUCTED',
    1,
    now()
  );

  return query
  select
    v_building_id,
    v_colony_id,
    v_colony_name,
    v_building_key,
    v_building_name,
    1,
    'active'::text,
    v_constructed_at;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.claim_my_mars_colony_resources()
 RETURNS TABLE(claim_id uuid, colony_id uuid, colony_name text, elapsed_seconds bigint, materials_claimed bigint, energy_claimed bigint, water_claimed bigint, science_claimed bigint, food_claimed bigint, materials_balance bigint, energy_balance bigint, water_balance bigint, science_balance bigint, food_balance bigint, claimed_at timestamp with time zone)
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

  v_last_claim_at timestamptz;
  v_now timestamptz := now();

  v_elapsed_seconds bigint;
  v_capped_seconds bigint;

  v_materials_per_hour bigint := 0;
  v_energy_per_hour bigint := 0;
  v_water_per_hour bigint := 0;
  v_science_per_hour bigint := 0;
  v_food_per_hour bigint := 0;

  v_materials_claimed bigint := 0;
  v_energy_claimed bigint := 0;
  v_water_claimed bigint := 0;
  v_science_claimed bigint := 0;
  v_food_claimed bigint := 0;

  v_claim_id uuid := gen_random_uuid();
  v_reference text;

  v_materials_balance bigint;
  v_energy_balance bigint;
  v_water_balance bigint;
  v_science_balance bigint;
  v_food_balance bigint;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  perform public.assert_my_mars_access();

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

  insert into public.mars_colony_production_state (
    colony_id,
    last_claim_at,
    updated_at
  )
  values (
    v_colony_id,
    v_now,
    v_now
  )
  on conflict (colony_id)
  do nothing;

  select state.last_claim_at
  into v_last_claim_at
  from public.mars_colony_production_state state
  where state.colony_id = v_colony_id
  for update;

  select
    coalesce(sum(
      rate.materials_per_hour * building.level
    ), 0),
    coalesce(sum(
      rate.energy_per_hour * building.level
    ), 0),
    coalesce(sum(
      rate.water_per_hour * building.level
    ), 0),
    coalesce(sum(
      rate.science_per_hour * building.level
    ), 0),
    coalesce(sum(
      rate.food_per_hour * building.level
    ), 0)
  into
    v_materials_per_hour,
    v_energy_per_hour,
    v_water_per_hour,
    v_science_per_hour,
    v_food_per_hour
  from public.mars_colony_buildings building
  join public.mars_resource_production_rates rate
    on rate.building_key = building.building_key
  where building.colony_id = v_colony_id
    and building.status = 'active';

  v_elapsed_seconds :=
    greatest(
      0,
      floor(
        extract(
          epoch from (v_now - v_last_claim_at)
        )
      )::bigint
    );

  v_capped_seconds :=
    least(
      v_elapsed_seconds,
      86400
    );

  v_materials_claimed :=
    floor(
      v_materials_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint;

  v_energy_claimed :=
    floor(
      v_energy_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint;

  v_water_claimed :=
    floor(
      v_water_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint;

  v_science_claimed :=
    floor(
      v_science_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint;

  v_food_claimed :=
    floor(
      v_food_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint;

  if (
    v_materials_claimed <= 0
    and v_energy_claimed <= 0
    and v_water_claimed <= 0
    and v_science_claimed <= 0
    and v_food_claimed <= 0
  ) then
    raise exception 'NOTHING_TO_CLAIM'
      using errcode = '22023';
  end if;

  v_reference :=
    'resource-production:' ||
    v_claim_id::text;

  if v_materials_claimed > 0 then
    perform *
    from public.credit_mars_colony_resource(
      v_colony_id,
      'materials',
      v_materials_claimed,
      'resource_production',
      v_reference || ':materials',
      v_builder_id,
      jsonb_build_object(
        'claim_id', v_claim_id,
        'elapsed_seconds', v_capped_seconds,
        'rate_per_hour', v_materials_per_hour
      )
    );
  end if;

  if v_energy_claimed > 0 then
    perform *
    from public.credit_mars_colony_resource(
      v_colony_id,
      'energy',
      v_energy_claimed,
      'resource_production',
      v_reference || ':energy',
      v_builder_id,
      jsonb_build_object(
        'claim_id', v_claim_id,
        'elapsed_seconds', v_capped_seconds,
        'rate_per_hour', v_energy_per_hour
      )
    );
  end if;

  if v_water_claimed > 0 then
    perform *
    from public.credit_mars_colony_resource(
      v_colony_id,
      'water',
      v_water_claimed,
      'resource_production',
      v_reference || ':water',
      v_builder_id,
      jsonb_build_object(
        'claim_id', v_claim_id,
        'elapsed_seconds', v_capped_seconds,
        'rate_per_hour', v_water_per_hour
      )
    );
  end if;

  if v_science_claimed > 0 then
    perform *
    from public.credit_mars_colony_resource(
      v_colony_id,
      'science',
      v_science_claimed,
      'resource_production',
      v_reference || ':science',
      v_builder_id,
      jsonb_build_object(
        'claim_id', v_claim_id,
        'elapsed_seconds', v_capped_seconds,
        'rate_per_hour', v_science_per_hour
      )
    );
  end if;

  if v_food_claimed > 0 then
    perform *
    from public.credit_mars_colony_resource(
      v_colony_id,
      'food',
      v_food_claimed,
      'resource_production',
      v_reference || ':food',
      v_builder_id,
      jsonb_build_object(
        'claim_id', v_claim_id,
        'elapsed_seconds', v_capped_seconds,
        'rate_per_hour', v_food_per_hour
      )
    );
  end if;

  update public.mars_colony_production_state state
  set
    last_claim_at = v_now,
    last_claim_id = v_claim_id,
    updated_at = v_now
  where state.colony_id = v_colony_id;

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
    'RESOURCES_CLAIMED',
    'resources_claimed:' || v_claim_id::text,
    v_builder_id,
    v_builder_id,
    'Colony Resources Collected',
    'Accumulated Colony production collected.',
    jsonb_build_object(
      'claim_id', v_claim_id,
      'elapsed_seconds', v_capped_seconds,
      'materials', v_materials_claimed,
      'energy', v_energy_claimed,
      'water', v_water_claimed,
      'science', v_science_claimed,
      'food', v_food_claimed
    ),
    v_now
  );

  select
    resources.materials,
    resources.energy,
    resources.water,
    resources.science,
    resources.food
  into
    v_materials_balance,
    v_energy_balance,
    v_water_balance,
    v_science_balance,
    v_food_balance
  from public.mars_colony_resources resources
  where resources.colony_id = v_colony_id;

  -- Mars Mission Progress.
  perform *
  from public.record_mars_mission_progress_internal(
    v_builder_id,
    'RESOURCES_CLAIMED',
    1,
    now()
  );

  return query
  select
    v_claim_id,
    v_colony_id,
    v_colony_name,

    v_capped_seconds,

    v_materials_claimed,
    v_energy_claimed,
    v_water_claimed,
    v_science_claimed,
    v_food_claimed,

    v_materials_balance,
    v_energy_balance,
    v_water_balance,
    v_science_balance,
    v_food_balance,

    v_now;
end;
$function$;

commit;

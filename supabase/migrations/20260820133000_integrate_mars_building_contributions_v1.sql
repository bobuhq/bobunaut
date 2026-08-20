begin;

-- ============================================================
-- BOBU Universe
-- Mars Building Contribution Integration v1
--
-- Building construction and upgrades become authoritative
-- civilization contributions.
--
-- Contribution amounts:
--   Construction: 100
--   Upgrade:      50 * new level
--
-- record_mars_contribution_internal() provides idempotency
-- through source_type + source_reference_id.
-- ============================================================


-- ============================================================
-- 1. CONSTRUCTION
-- ============================================================

create or replace function public.construct_my_mars_colony_building(
  p_building_key text
)
returns table(
  building_id uuid,
  colony_id uuid,
  colony_name text,
  building_key text,
  building_name text,
  building_level integer,
  building_status text,
  constructed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
    'building_constructed',
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


-- ============================================================
-- 2. UPGRADE
-- ============================================================

create or replace function public.upgrade_my_mars_colony_building(
  p_building_key text
)
returns table(
  building_id uuid,
  colony_id uuid,
  colony_name text,
  building_key text,
  building_name text,
  previous_level integer,
  new_level integer,
  materials_remaining bigint,
  energy_remaining bigint,
  water_remaining bigint,
  science_remaining bigint,
  food_remaining bigint,
  upgraded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
    'building_upgraded',
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


-- Preserve RPC security boundary.

revoke all
on function public.construct_my_mars_colony_building(text)
from public;

revoke all
on function public.construct_my_mars_colony_building(text)
from anon;

grant execute
on function public.construct_my_mars_colony_building(text)
to authenticated;


revoke all
on function public.upgrade_my_mars_colony_building(text)
from public;

revoke all
on function public.upgrade_my_mars_colony_building(text)
from anon;

grant execute
on function public.upgrade_my_mars_colony_building(text)
to authenticated;


comment on function public.construct_my_mars_colony_building(text) is
'Atomically constructs a Mars Colony building, debits authoritative Colony resources, records Colony history, and records authoritative Colony contribution.';

comment on function public.upgrade_my_mars_colony_building(text) is
'Atomically upgrades a Mars Colony building, debits authoritative Colony resources, records Colony history, and records authoritative Colony contribution.';

commit;

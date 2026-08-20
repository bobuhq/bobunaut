begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Building Construction Economy v1
--
-- Command Hub remains the automatic Colony core structure.
-- Habitat / Energy / Water / Science Lab consume Colony
-- resources when first constructed.
--
-- No GP / Mining / Referral / Wallet side effects.
-- All costs are server-authoritative.
-- ============================================================


-- ------------------------------------------------------------
-- Construction Cost Catalog
-- ------------------------------------------------------------

create table public.mars_building_construction_costs (
  building_key text primary key
    references public.mars_building_definitions(building_key)
    on delete restrict,

  materials bigint not null default 0
    check (materials >= 0),

  energy bigint not null default 0
    check (energy >= 0),

  water bigint not null default 0
    check (water >= 0),

  science bigint not null default 0
    check (science >= 0),

  food bigint not null default 0
    check (food >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


insert into public.mars_building_construction_costs (
  building_key,
  materials,
  energy,
  water,
  science,
  food
)
values
  (
    'habitat',
    200,
    75,
    125,
    0,
    100
  ),
  (
    'energy',
    250,
    150,
    0,
    0,
    0
  ),
  (
    'water',
    200,
    100,
    175,
    0,
    0
  ),
  (
    'science_lab',
    300,
    150,
    75,
    200,
    0
  );


alter table public.mars_building_construction_costs
enable row level security;

revoke all
on public.mars_building_construction_costs
from public, anon, authenticated;


-- ============================================================
-- Construction Cost Read Model
-- ============================================================

create or replace function
public.get_my_mars_colony_construction_costs()
returns table (
  building_key text,
  building_name text,
  materials_cost bigint,
  energy_cost bigint,
  water_cost bigint,
  science_cost bigint,
  food_cost bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_builder_id uuid := auth.uid();
  v_colony_id uuid;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select m.colony_id
  into v_colony_id
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = v_builder_id
    and m.status = 'active'
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    cost.building_key,
    definition.name,
    cost.materials,
    cost.energy,
    cost.water,
    cost.science,
    cost.food
  from public.mars_building_construction_costs cost
  join public.mars_building_definitions definition
    on definition.building_key = cost.building_key
  order by definition.display_order;
end;
$$;

revoke all
on function public.get_my_mars_colony_construction_costs()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_construction_costs()
to authenticated;


-- ============================================================
-- Resource-Aware Construction RPC
-- ============================================================

create or replace function
public.construct_my_mars_colony_building(
  p_building_key text
)
returns table (
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
as $$
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

  -- ----------------------------------------------------------
  -- Atomic resource debits.
  -- Any failure rolls back all previous debits automatically.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Construct building only after all resource debits succeed.
  -- ----------------------------------------------------------

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
$$;


revoke all
on function public.construct_my_mars_colony_building(text)
from public, anon, authenticated;

grant execute
on function public.construct_my_mars_colony_building(text)
to authenticated;


comment on table public.mars_building_construction_costs is
'Server-authoritative BUILD MARS first-construction resource costs. Command Hub is excluded because it is Colony core infrastructure.';

comment on function public.get_my_mars_colony_construction_costs() is
'Returns server-authoritative first-construction costs for the authenticated Builder active Mars Colony.';

comment on function public.construct_my_mars_colony_building(text) is
'Atomically spends Colony resources and constructs one available BUILD MARS building for the authenticated Founder or Leader. Awards and spends no GP.';

commit;

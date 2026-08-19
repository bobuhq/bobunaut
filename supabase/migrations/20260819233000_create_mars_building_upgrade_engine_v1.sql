begin;

-- ============================================================
-- BOBU BUILD MARS
-- Building Upgrade Engine v1
--
-- Server-authoritative upgrade costs.
-- Founder / Leader only.
-- Atomic resource debits + building level update + history.
-- ============================================================


-- ------------------------------------------------------------
-- Upgrade Cost Catalog
-- ------------------------------------------------------------

create table public.mars_building_upgrade_costs (
  building_key text not null
    references public.mars_building_definitions(building_key)
    on delete restrict,

  from_level integer not null
    check (from_level > 0),

  to_level integer not null
    check (to_level = from_level + 1),

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
  updated_at timestamptz not null default now(),

  primary key (
    building_key,
    from_level
  )
);


-- ------------------------------------------------------------
-- Initial Level 1 -> 2 costs
-- ------------------------------------------------------------

insert into public.mars_building_upgrade_costs (
  building_key,
  from_level,
  to_level,
  materials,
  energy,
  water,
  science,
  food
)
values
  (
    'command_hub',
    1,
    2,
    500,
    300,
    150,
    150,
    100
  ),
  (
    'habitat',
    1,
    2,
    300,
    100,
    200,
    0,
    150
  ),
  (
    'energy',
    1,
    2,
    350,
    250,
    0,
    0,
    0
  ),
  (
    'water',
    1,
    2,
    300,
    150,
    250,
    0,
    0
  ),
  (
    'science_lab',
    1,
    2,
    400,
    200,
    100,
    300,
    0
  )
on conflict (
  building_key,
  from_level
)
do update
set
  to_level = excluded.to_level,
  materials = excluded.materials,
  energy = excluded.energy,
  water = excluded.water,
  science = excluded.science,
  food = excluded.food,
  updated_at = now();


alter table public.mars_building_upgrade_costs
enable row level security;

revoke all
on public.mars_building_upgrade_costs
from public, anon, authenticated;


-- ------------------------------------------------------------
-- Read Model
-- ------------------------------------------------------------

create or replace function
public.get_my_mars_colony_building_upgrades()
returns table (
  building_key text,
  building_name text,
  current_level integer,
  max_level integer,
  can_upgrade boolean,
  next_level integer,
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
    b.building_key,
    d.name,
    b.level,
    d.max_level,
    (
      b.level < d.max_level
      and cost.from_level is not null
    ),
    coalesce(cost.to_level, b.level),
    coalesce(cost.materials, 0),
    coalesce(cost.energy, 0),
    coalesce(cost.water, 0),
    coalesce(cost.science, 0),
    coalesce(cost.food, 0)
  from public.mars_colony_buildings b
  join public.mars_building_definitions d
    on d.building_key = b.building_key
  left join public.mars_building_upgrade_costs cost
    on cost.building_key = b.building_key
   and cost.from_level = b.level
  where b.colony_id = v_colony_id
    and b.status = 'active'
  order by d.display_order;
end;
$$;

revoke all
on function public.get_my_mars_colony_building_upgrades()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_building_upgrades()
to authenticated;


-- ------------------------------------------------------------
-- Upgrade RPC
-- ------------------------------------------------------------

create or replace function
public.upgrade_my_mars_colony_building(
  p_building_key text
)
returns table (
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
as $$
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
$$;


revoke all
on function public.upgrade_my_mars_colony_building(text)
from public, anon, authenticated;

grant execute
on function public.upgrade_my_mars_colony_building(text)
to authenticated;


comment on table public.mars_building_upgrade_costs is
'Server-authoritative BUILD MARS Colony building upgrade cost catalog.';

comment on function public.get_my_mars_colony_building_upgrades() is
'Returns current building levels and configured server-side next-level upgrade costs for the authenticated Builder Colony.';

comment on function public.upgrade_my_mars_colony_building(text) is
'Atomically spends Colony resources and upgrades one constructed Colony building for Founder or Leader.';

commit;

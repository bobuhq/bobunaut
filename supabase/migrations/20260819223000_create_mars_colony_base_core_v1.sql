begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Base Core v1
--
-- Real production Colony infrastructure domain.
--
-- Initial structures:
--   COMMAND HUB
--   HABITAT
--   ENERGY
--   WATER
--   SCIENCE LAB
--
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================


-- ------------------------------------------------------------
-- Building Catalog
-- ------------------------------------------------------------

create table if not exists public.mars_building_definitions (
  building_key text primary key,

  name text not null unique,
  category text not null,

  description text not null,

  max_level integer not null default 10
    check (max_level > 0),

  display_order integer not null
    check (display_order > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


insert into public.mars_building_definitions (
  building_key,
  name,
  category,
  description,
  max_level,
  display_order
)
values
  (
    'command_hub',
    'Command Hub',
    'core',
    'Central operational command structure of a Mars Colony.',
    10,
    1
  ),
  (
    'habitat',
    'Habitat',
    'life_support',
    'Residential and crew-support infrastructure for Colony Builders.',
    10,
    2
  ),
  (
    'energy',
    'Energy',
    'infrastructure',
    'Primary Colony power generation and distribution infrastructure.',
    10,
    3
  ),
  (
    'water',
    'Water',
    'life_support',
    'Water extraction, storage, recycling, and distribution infrastructure.',
    10,
    4
  ),
  (
    'science_lab',
    'Science Lab',
    'science',
    'Research and scientific development infrastructure.',
    10,
    5
  )
on conflict (building_key)
do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  max_level = excluded.max_level,
  display_order = excluded.display_order,
  updated_at = now();


-- ------------------------------------------------------------
-- Colony Building State
--
-- A row exists only when a structure is actually constructed.
-- ------------------------------------------------------------

create table if not exists public.mars_colony_buildings (
  id uuid primary key default gen_random_uuid(),

  colony_id uuid not null
    references public.mars_colonies(id)
    on delete restrict,

  building_key text not null
    references public.mars_building_definitions(building_key)
    on delete restrict,

  level integer not null default 1
    check (level > 0),

  status text not null default 'active'
    check (
      status in (
        'active',
        'upgrading',
        'disabled',
        'archived'
      )
    ),

  constructed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (colony_id, building_key)
);


create index if not exists
  mars_colony_buildings_colony_idx
on public.mars_colony_buildings (
  colony_id,
  status
);


alter table public.mars_building_definitions
enable row level security;

alter table public.mars_colony_buildings
enable row level security;


-- ------------------------------------------------------------
-- Command Hub bootstrap
--
-- Every real Colony has one Command Hub from creation.
-- ------------------------------------------------------------

create or replace function public.bootstrap_mars_colony_command_hub()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.mars_colony_buildings (
    colony_id,
    building_key,
    level,
    status,
    constructed_at,
    updated_at
  )
  values (
    new.id,
    'command_hub',
    1,
    'active',
    new.created_at,
    new.created_at
  )
  on conflict (colony_id, building_key)
  do nothing;

  return new;
end;
$$;


drop trigger if exists
  bootstrap_mars_colony_command_hub
on public.mars_colonies;

create trigger bootstrap_mars_colony_command_hub
after insert
on public.mars_colonies
for each row
execute function public.bootstrap_mars_colony_command_hub();


-- ------------------------------------------------------------
-- Backfill existing real Colonies
-- ------------------------------------------------------------

insert into public.mars_colony_buildings (
  colony_id,
  building_key,
  level,
  status,
  constructed_at,
  updated_at
)
select
  c.id,
  'command_hub',
  1,
  'active',
  c.created_at,
  now()
from public.mars_colonies c
where c.status = 'active'
on conflict (colony_id, building_key)
do nothing;


-- ------------------------------------------------------------
-- Authenticated Colony Base Read Model
--
-- Returns all production building definitions and the real
-- construction state for the authenticated Builder's Colony.
-- ------------------------------------------------------------

create or replace function public.get_my_mars_colony_base()
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
  constructed_at timestamptz
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
    c.id,
    c.name
  into
    v_colony_id,
    v_colony_name
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
    building.constructed_at

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


revoke all
on table public.mars_building_definitions
from public, anon, authenticated;

revoke all
on table public.mars_colony_buildings
from public, anon, authenticated;


comment on table public.mars_building_definitions is
'Production BUILD MARS Colony building catalog.';

comment on table public.mars_colony_buildings is
'Real constructed infrastructure belonging to Mars Colonies.';

comment on function public.get_my_mars_colony_base() is
'Returns the authenticated Builder active Colony infrastructure including constructed and available building definitions. Read-only.';

commit;

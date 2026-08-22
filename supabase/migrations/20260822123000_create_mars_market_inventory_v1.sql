begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Market + Inventory v1
--
-- Production only.
-- Server-authoritative.
--
-- Flow:
-- MARKET -> BUY -> INVENTORY -> PLACE -> SAVE
--
-- Existing Colony resources remain the payment currency:
-- materials / energy / water / science / food
-- ============================================================


-- ------------------------------------------------------------
-- Market catalog
-- ------------------------------------------------------------

create table if not exists public.mars_market_catalog (
  item_key text primary key,

  name text not null,
  category text not null,
  description text not null,

  item_type text not null
    check (
      item_type in (
        'building',
        'infrastructure',
        'equipment',
        'vehicle',
        'decoration'
      )
    ),

  building_key text null
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

  active boolean not null default true,

  display_order integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- Seed REAL currently supported buildings.
--
-- Prices mirror the existing authoritative construction costs.
-- No imaginary client-side prices.
-- ------------------------------------------------------------

insert into public.mars_market_catalog (
  item_key,
  name,
  category,
  description,
  item_type,
  building_key,
  materials,
  energy,
  water,
  science,
  food,
  active,
  display_order
)
values
  (
    'habitat',
    'Habitat',
    'Life Support',
    'Residential and crew-support infrastructure for Colony Builders.',
    'building',
    'habitat',
    200,
    75,
    125,
    0,
    100,
    true,
    10
  ),
  (
    'energy',
    'Energy',
    'Infrastructure',
    'Primary Colony power generation and distribution infrastructure.',
    'building',
    'energy',
    250,
    150,
    0,
    0,
    0,
    true,
    20
  ),
  (
    'water',
    'Water',
    'Life Support',
    'Water extraction, storage, recycling and distribution infrastructure.',
    'building',
    'water',
    200,
    100,
    175,
    0,
    0,
    true,
    30
  ),
  (
    'science_lab',
    'Science Lab',
    'Science',
    'Research and scientific development infrastructure.',
    'building',
    'science_lab',
    300,
    150,
    75,
    200,
    0,
    true,
    40
  )
on conflict (item_key)
do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  item_type = excluded.item_type,
  building_key = excluded.building_key,
  materials = excluded.materials,
  energy = excluded.energy,
  water = excluded.water,
  science = excluded.science,
  food = excluded.food,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();


alter table public.mars_market_catalog
enable row level security;

revoke all
on public.mars_market_catalog
from public, anon, authenticated;


-- ------------------------------------------------------------
-- Colony inventory
-- ------------------------------------------------------------

create table if not exists public.mars_colony_inventory (
  id uuid primary key default gen_random_uuid(),

  colony_id uuid not null
    references public.mars_colonies(id)
    on delete cascade,

  item_key text not null
    references public.mars_market_catalog(item_key)
    on delete restrict,

  quantity integer not null default 1
    check (quantity >= 0),

  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    colony_id,
    item_key
  )
);


create index if not exists
mars_colony_inventory_colony_idx
on public.mars_colony_inventory(colony_id);


alter table public.mars_colony_inventory
enable row level security;

revoke all
on public.mars_colony_inventory
from public, anon, authenticated;


-- ------------------------------------------------------------
-- Market read model
-- ------------------------------------------------------------

create or replace function
public.get_my_mars_market()
returns table (
  item_key text,
  name text,
  category text,
  description text,
  item_type text,
  building_key text,

  materials_cost bigint,
  energy_cost bigint,
  water_cost bigint,
  science_cost bigint,
  food_cost bigint,

  owned_quantity integer,
  already_constructed boolean
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
    market.item_key,
    market.name,
    market.category,
    market.description,
    market.item_type,
    market.building_key,

    market.materials,
    market.energy,
    market.water,
    market.science,
    market.food,

    coalesce(inventory.quantity, 0),

    case
      when market.building_key is null then false
      else exists (
        select 1
        from public.mars_colony_buildings building
        where building.colony_id = v_colony_id
          and building.building_key = market.building_key
          and building.status <> 'archived'
      )
    end

  from public.mars_market_catalog market

  left join public.mars_colony_inventory inventory
    on inventory.colony_id = v_colony_id
   and inventory.item_key = market.item_key

  where market.active = true

  order by market.display_order;
end;
$$;


revoke all
on function public.get_my_mars_market()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_market()
to authenticated;


-- ------------------------------------------------------------
-- Inventory read model
-- ------------------------------------------------------------

create or replace function
public.get_my_mars_inventory()
returns table (
  inventory_id uuid,
  item_key text,
  item_name text,
  item_type text,
  building_key text,
  quantity integer,
  purchased_at timestamptz
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
    inventory.id,
    inventory.item_key,
    market.name,
    market.item_type,
    market.building_key,
    inventory.quantity,
    inventory.purchased_at

  from public.mars_colony_inventory inventory

  join public.mars_market_catalog market
    on market.item_key = inventory.item_key

  where inventory.colony_id = v_colony_id
    and inventory.quantity > 0

  order by inventory.updated_at desc;
end;
$$;


revoke all
on function public.get_my_mars_inventory()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_inventory()
to authenticated;


-- ------------------------------------------------------------
-- Atomic BUY RPC
-- ------------------------------------------------------------

create or replace function
public.buy_my_mars_market_item(
  p_item_key text
)
returns table (
  item_key text,
  item_name text,
  quantity integer,

  materials_remaining bigint,
  energy_remaining bigint,
  water_remaining bigint,
  science_remaining bigint,
  food_remaining bigint
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

  v_name text;
  v_building_key text;

  v_materials bigint;
  v_energy bigint;
  v_water bigint;
  v_science bigint;
  v_food bigint;

  v_quantity integer;

  v_materials_remaining bigint;
  v_energy_remaining bigint;
  v_water_remaining bigint;
  v_science_remaining bigint;
  v_food_remaining bigint;

  v_source_reference text;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if char_length(v_item_key) = 0 then
    raise exception 'MARKET_ITEM_REQUIRED'
      using errcode = '22023';
  end if;

  select
    m.colony_id,
    m.role
  into
    v_colony_id,
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
    market.name,
    market.building_key,
    market.materials,
    market.energy,
    market.water,
    market.science,
    market.food
  into
    v_name,
    v_building_key,
    v_materials,
    v_energy,
    v_water,
    v_science,
    v_food
  from public.mars_market_catalog market
  where market.item_key = v_item_key
    and market.active = true;

  if not found then
    raise exception 'MARKET_ITEM_NOT_FOUND'
      using errcode = '22023';
  end if;

  /*
   * Current building catalog is unique-per-colony.
   * Do not allow duplicate building purchase.
   */
  if v_building_key is not null then
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

    if exists (
      select 1
      from public.mars_colony_inventory inventory
      where inventory.colony_id = v_colony_id
        and inventory.item_key = v_item_key
        and inventory.quantity > 0
    ) then
      raise exception 'BUILDING_ALREADY_IN_INVENTORY'
        using errcode = '23505';
    end if;
  end if;

  v_source_reference :=
    'mars-market:' ||
    v_colony_id::text ||
    ':' ||
    v_item_key ||
    ':' ||
    gen_random_uuid()::text;


  -- ----------------------------------------------------------
  -- Atomic server-authoritative resource debits
  -- ----------------------------------------------------------

  if v_materials > 0 then
    select new_balance
    into v_materials_remaining
    from public.debit_mars_colony_resource_internal(
      v_colony_id,
      'materials',
      v_materials,
      'market_purchase',
      v_source_reference || ':materials',
      v_builder_id,
      jsonb_build_object(
        'item_key', v_item_key,
        'item_name', v_name
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
      'market_purchase',
      v_source_reference || ':energy',
      v_builder_id,
      jsonb_build_object(
        'item_key', v_item_key,
        'item_name', v_name
      )
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
      'market_purchase',
      v_source_reference || ':water',
      v_builder_id,
      jsonb_build_object(
        'item_key', v_item_key,
        'item_name', v_name
      )
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
      'market_purchase',
      v_source_reference || ':science',
      v_builder_id,
      jsonb_build_object(
        'item_key', v_item_key,
        'item_name', v_name
      )
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
      'market_purchase',
      v_source_reference || ':food',
      v_builder_id,
      jsonb_build_object(
        'item_key', v_item_key,
        'item_name', v_name
      )
    );
  else
    select food
    into v_food_remaining
    from public.mars_colony_resources
    where colony_id = v_colony_id;
  end if;


  -- ----------------------------------------------------------
  -- Add item to real Colony inventory.
  -- ----------------------------------------------------------

  insert into public.mars_colony_inventory (
    colony_id,
    item_key,
    quantity,
    purchased_at,
    updated_at
  )
  values (
    v_colony_id,
    v_item_key,
    1,
    now(),
    now()
  )
  on conflict (
    colony_id,
    item_key
  )
  do update
  set
    quantity =
      public.mars_colony_inventory.quantity + 1,
    updated_at = now()
  returning public.mars_colony_inventory.quantity
  into v_quantity;


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
    'market_purchase',
    'market_purchase:' ||
      gen_random_uuid()::text,
    v_builder_id,
    v_builder_id,
    'Mars Market Purchase',
    v_name || ' purchased from Mars Market.',
    jsonb_build_object(
      'item_key', v_item_key,
      'item_name', v_name,
      'materials_cost', v_materials,
      'energy_cost', v_energy,
      'water_cost', v_water,
      'science_cost', v_science,
      'food_cost', v_food,
      'inventory_quantity', v_quantity
    ),
    now()
  );


  return query
  select
    v_item_key,
    v_name,
    v_quantity,
    v_materials_remaining,
    v_energy_remaining,
    v_water_remaining,
    v_science_remaining,
    v_food_remaining;
end;
$$;


revoke all
on function public.buy_my_mars_market_item(text)
from public, anon, authenticated;

grant execute
on function public.buy_my_mars_market_item(text)
to authenticated;


comment on table public.mars_market_catalog is
'Server-authoritative BUILD MARS market catalog.';

comment on table public.mars_colony_inventory is
'Persistent Colony inventory containing purchased but not necessarily placed Mars items.';

comment on function public.buy_my_mars_market_item(text) is
'Atomically spends Colony resources and places the purchased Mars item into persistent Colony inventory. Does not construct or place the building.';

commit;

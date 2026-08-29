begin;

alter table public.mars_market_catalog
  add column if not exists required_command_hub_level integer;

update public.mars_market_catalog
set required_command_hub_level = 1
where required_command_hub_level is null;

alter table public.mars_market_catalog
  alter column required_command_hub_level set default 1;

alter table public.mars_market_catalog
  alter column required_command_hub_level set not null;

alter table public.mars_market_catalog
  drop constraint if exists
    mars_market_catalog_required_command_hub_level_check;

alter table public.mars_market_catalog
  add constraint
    mars_market_catalog_required_command_hub_level_check
  check (
    required_command_hub_level >= 1
    and required_command_hub_level <= 10
  );

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

  v_required_command_hub_level integer;
  v_command_hub_level integer;

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
    market.required_command_hub_level,
    market.materials,
    market.energy,
    market.water,
    market.science,
    market.food
  into
    v_name,
    v_building_key,
    v_required_command_hub_level,
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

  select
    progression.command_hub_level
  into
    v_command_hub_level
  from public.get_mars_command_hub_progression_for_colony(
    v_colony_id
  ) progression;

  if v_command_hub_level < v_required_command_hub_level then
    raise exception 'COMMAND_HUB_LEVEL_REQUIRED'
      using
        errcode = '22023',
        detail =
          'Command Hub Level ' ||
          v_required_command_hub_level::text ||
          ' is required to purchase this Market item.';
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

comment on column
public.mars_market_catalog.required_command_hub_level is
'Minimum active Command Hub level required to purchase this Market item. Enforced server-side by buy_my_mars_market_item().';

comment on function
public.buy_my_mars_market_item(text) is
'Atomic server-authoritative Mars Market purchase with Command Hub progression enforcement.';

commit;

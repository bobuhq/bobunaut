begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Resource Production Engine v1
--
-- Server-authoritative Colony production.
-- Production is derived from real active building levels.
-- Maximum offline accrual: 24 hours.
-- Claim requires Founder / Leader control.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================


-- ------------------------------------------------------------
-- Production rate catalog
--
-- Values are per hour, per building level.
-- ------------------------------------------------------------

create table public.mars_resource_production_rates (
  building_key text primary key
    references public.mars_building_definitions(building_key)
    on delete restrict,

  materials_per_hour bigint not null default 0
    check (materials_per_hour >= 0),

  energy_per_hour bigint not null default 0
    check (energy_per_hour >= 0),

  water_per_hour bigint not null default 0
    check (water_per_hour >= 0),

  science_per_hour bigint not null default 0
    check (science_per_hour >= 0),

  food_per_hour bigint not null default 0
    check (food_per_hour >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


insert into public.mars_resource_production_rates (
  building_key,
  materials_per_hour,
  energy_per_hour,
  water_per_hour,
  science_per_hour,
  food_per_hour
)
values
  (
    'command_hub',
    40,
    10,
    10,
    5,
    10
  ),
  (
    'habitat',
    0,
    0,
    10,
    0,
    30
  ),
  (
    'energy',
    0,
    50,
    0,
    0,
    0
  ),
  (
    'water',
    0,
    0,
    50,
    0,
    0
  ),
  (
    'science_lab',
    0,
    0,
    0,
    40,
    0
  );


alter table public.mars_resource_production_rates
enable row level security;

revoke all
on public.mars_resource_production_rates
from public, anon, authenticated;


-- ------------------------------------------------------------
-- Colony production state
-- ------------------------------------------------------------

create table public.mars_colony_production_state (
  colony_id uuid primary key
    references public.mars_colonies(id)
    on delete restrict,

  last_claim_at timestamptz not null default now(),
  last_claim_id uuid,
  updated_at timestamptz not null default now()
);


alter table public.mars_colony_production_state
enable row level security;

revoke all
on public.mars_colony_production_state
from public, anon, authenticated;


-- ------------------------------------------------------------
-- Bootstrap production state for every new Colony
-- ------------------------------------------------------------

create or replace function
public.bootstrap_mars_colony_production_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.mars_colony_production_state (
    colony_id,
    last_claim_at,
    updated_at
  )
  values (
    new.id,
    new.created_at,
    new.created_at
  )
  on conflict (colony_id)
  do nothing;

  return new;
end;
$$;


revoke all
on function public.bootstrap_mars_colony_production_state()
from public, anon, authenticated;


drop trigger if exists
  bootstrap_mars_colony_production_state
on public.mars_colonies;

create trigger bootstrap_mars_colony_production_state
after insert
on public.mars_colonies
for each row
execute function public.bootstrap_mars_colony_production_state();


-- Existing Colonies start production now.
-- No retroactive production windfall.
insert into public.mars_colony_production_state (
  colony_id,
  last_claim_at,
  updated_at
)
select
  c.id,
  now(),
  now()
from public.mars_colonies c
where c.status = 'active'
on conflict (colony_id)
do nothing;


-- ------------------------------------------------------------
-- Harden existing resource bootstrap helper.
-- Trigger execution does not require authenticated EXECUTE.
-- ------------------------------------------------------------

revoke all
on function public.bootstrap_mars_colony_resources()
from public, anon, authenticated;


-- ============================================================
-- Production Read Model
-- ============================================================

create or replace function
public.get_my_mars_resource_production()
returns table (
  colony_id uuid,
  colony_name text,

  last_claim_at timestamptz,
  accrued_seconds bigint,
  max_accrual_seconds bigint,

  materials_per_hour bigint,
  energy_per_hour bigint,
  water_per_hour bigint,
  science_per_hour bigint,
  food_per_hour bigint,

  claimable_materials bigint,
  claimable_energy bigint,
  claimable_water bigint,
  claimable_science bigint,
  claimable_food bigint
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
  v_colony_name text;

  v_last_claim_at timestamptz;
  v_now timestamptz := now();

  v_elapsed_seconds bigint;
  v_capped_seconds bigint;

  v_materials_per_hour bigint := 0;
  v_energy_per_hour bigint := 0;
  v_water_per_hour bigint := 0;
  v_science_per_hour bigint := 0;
  v_food_per_hour bigint := 0;
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

  select state.last_claim_at
  into v_last_claim_at
  from public.mars_colony_production_state state
  where state.colony_id = v_colony_id;

  if v_last_claim_at is null then
    v_last_claim_at := v_now;
  end if;

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

  return query
  select
    v_colony_id,
    v_colony_name,

    v_last_claim_at,
    v_capped_seconds,
    86400::bigint,

    v_materials_per_hour,
    v_energy_per_hour,
    v_water_per_hour,
    v_science_per_hour,
    v_food_per_hour,

    floor(
      v_materials_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint,

    floor(
      v_energy_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint,

    floor(
      v_water_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint,

    floor(
      v_science_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint,

    floor(
      v_food_per_hour::numeric *
      v_capped_seconds::numeric /
      3600
    )::bigint;
end;
$$;


revoke all
on function public.get_my_mars_resource_production()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_resource_production()
to authenticated;


-- ============================================================
-- Atomic Resource Production Claim
-- ============================================================

create or replace function
public.claim_my_mars_colony_resources()
returns table (
  claim_id uuid,
  colony_id uuid,
  colony_name text,

  elapsed_seconds bigint,

  materials_claimed bigint,
  energy_claimed bigint,
  water_claimed bigint,
  science_claimed bigint,
  food_claimed bigint,

  materials_balance bigint,
  energy_balance bigint,
  water_balance bigint,
  science_balance bigint,
  food_balance bigint,

  claimed_at timestamptz
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
    'resources_claimed',
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
$$;


revoke all
on function public.claim_my_mars_colony_resources()
from public, anon, authenticated;

grant execute
on function public.claim_my_mars_colony_resources()
to authenticated;


comment on table public.mars_resource_production_rates is
'Server-authoritative BUILD MARS hourly Colony resource production rates per active building level.';

comment on table public.mars_colony_production_state is
'Tracks authoritative Colony resource production claim state and prevents duplicate elapsed-time claims.';

comment on function public.get_my_mars_resource_production() is
'Returns server-calculated BUILD MARS production rates and currently claimable Colony resources, capped at 24 hours of accrual.';

comment on function public.claim_my_mars_colony_resources() is
'Atomically collects elapsed BUILD MARS Colony resource production for an authenticated Founder or Leader. Maximum accrual is 24 hours.';

commit;

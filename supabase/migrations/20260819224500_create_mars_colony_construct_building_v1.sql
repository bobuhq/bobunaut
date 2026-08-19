begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Construct Colony Building v1
--
-- Founder / Leader may construct one available building.
-- Command Hub cannot be manually constructed.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.construct_my_mars_colony_building(
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
declare
  v_actor_builder_id uuid := auth.uid();

  v_colony_id uuid;
  v_colony_name text;
  v_role text;

  v_building_name text;
  v_building_id uuid;
  v_constructed_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_building_key is null
     or char_length(trim(p_building_key)) = 0 then
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

  if trim(p_building_key) = 'command_hub' then
    raise exception 'COMMAND_HUB_ALREADY_CORE'
      using errcode = '22023';
  end if;

  select definition.name
  into v_building_name
  from public.mars_building_definitions definition
  where definition.building_key = trim(p_building_key);

  if v_building_name is null then
    raise exception 'BUILDING_NOT_FOUND'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.mars_colony_buildings building
    where building.colony_id = v_colony_id
      and building.building_key = trim(p_building_key)
      and building.status <> 'archived'
  ) then
    raise exception 'BUILDING_ALREADY_CONSTRUCTED'
      using errcode = '23505';
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
    trim(p_building_key),
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
    v_building_name || ' constructed in ' || v_colony_name || '.',
    jsonb_build_object(
      'building_id', v_building_id,
      'building_key', trim(p_building_key),
      'building_name', v_building_name,
      'level', 1
    ),
    v_constructed_at
  );

  return query
  select
    v_building_id,
    v_colony_id,
    v_colony_name,
    trim(p_building_key),
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


comment on function public.construct_my_mars_colony_building(text) is
'Constructs one available BUILD MARS Colony building for the authenticated Founder or Leader. Awards and spends no GP.';


commit;

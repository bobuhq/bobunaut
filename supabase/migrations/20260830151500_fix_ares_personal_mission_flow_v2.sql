insert into public.mars_hidden_mission_catalog (
  mission_key,
  sector_key,
  title,
  briefing,
  target_x,
  target_z,
  target_radius,
  reward_gp,
  enabled
)
values
(
  'ares-echo-01',
  'ares',
  'Echo Beneath Ares',
  'Command sensors detected a repeating subsurface signal beyond the primary survey zone. Reach the coordinates and investigate the source.',
  -92,
  44,
  6,
  150,
  true
),
(
  'ares-fracture-02',
  'ares',
  'The Silent Fracture',
  'A narrow surface fracture is producing an intermittent electromagnetic signature. Reach the marked zone and investigate the source.',
  76,
  -58,
  6,
  150,
  true
),
(
  'ares-relay-03',
  'ares',
  'Buried Relay',
  'Command detected a weak repeating transmission beneath the Ares regolith. Locate the buried signal and complete a field scan.',
  -112,
  -74,
  6,
  150,
  true
),
(
  'ares-scar-04',
  'ares',
  'The Cold Scar',
  'Thermal sensors identified an unusual low-temperature signature beyond the primary landing corridor. Reach the site and investigate.',
  94,
  82,
  6,
  150,
  true
)
on conflict (mission_key)
do update set
  sector_key = excluded.sector_key,
  title = excluded.title,
  briefing = excluded.briefing,
  target_x = excluded.target_x,
  target_z = excluded.target_z,
  target_radius = excluded.target_radius,
  reward_gp = excluded.reward_gp,
  enabled = excluded.enabled,
  updated_at = now();

with active_rows as (
  select
    m.id,
    row_number() over (
      order by
        m.accepted_at,
        m.builder_id
    ) - 1 as slot
  from public.builder_mars_hidden_missions m
  where
    m.cycle_key =
      to_char(
        timezone('UTC', now()),
        'YYYY-MM-DD'
      )
    and m.status = 'accepted'
),
assignments as (
  select
    a.id,
    a.slot,
    case mod(a.slot, 4)
      when 0 then 'ares-echo-01'
      when 1 then 'ares-fracture-02'
      when 2 then 'ares-relay-03'
      else 'ares-scar-04'
    end as mission_key,
    case mod(a.slot, 4)
      when 0 then -92::double precision
      when 1 then 76::double precision
      when 2 then -112::double precision
      else 94::double precision
    end as target_x,
    case mod(a.slot, 4)
      when 0 then 44::double precision
      when 1 then -58::double precision
      when 2 then -74::double precision
      else 82::double precision
    end as target_z
  from active_rows a
)
update public.builder_mars_hidden_missions m
set
  mission_key = a.mission_key,
  assigned_target_x =
    a.target_x +
    floor(a.slot / 4.0) * 8,
  assigned_target_z =
    a.target_z +
    floor(a.slot / 4.0) * 8,
  metadata =
    coalesce(
      m.metadata,
      '{}'::jsonb
    ) ||
    jsonb_build_object(
      'assignment',
      'personal_ares_mission_v2',
      'slot',
      a.slot
    )
from assignments a
where m.id = a.id;

create or replace function public.get_my_ares_hidden_mission()
returns table (
  mission_key text,
  title text,
  briefing text,
  target_x double precision,
  target_z double precision,
  target_radius double precision,
  reward_gp bigint,
  cycle_key text,
  status text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
  v_cycle_key text;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_my_mars_access();

  v_cycle_key :=
    to_char(
      timezone('UTC', now()),
      'YYYY-MM-DD'
    );

  return query
  select
    c.mission_key,
    c.title,
    c.briefing,
    coalesce(
      m.assigned_target_x,
      c.target_x
    ),
    coalesce(
      m.assigned_target_z,
      c.target_z
    ),
    c.target_radius,
    c.reward_gp,
    m.cycle_key,
    m.status,
    m.accepted_at
  from public.builder_mars_hidden_missions m
  join public.mars_hidden_mission_catalog c
    on c.mission_key = m.mission_key
  where
    m.builder_id = v_builder_id
    and m.cycle_key = v_cycle_key
    and m.status = 'accepted'
    and c.sector_key = 'ares'
    and c.enabled = true
  order by m.accepted_at desc
  limit 1;
end;
$$;

create or replace function public.access_my_ares_mission_terminal()
returns table (
  mission_key text,
  title text,
  briefing text,
  target_x double precision,
  target_z double precision,
  target_radius double precision,
  reward_gp bigint,
  cycle_key text,
  status text,
  accepted_at timestamptz,
  accepted_now boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
  v_cycle_key text;
  v_catalog public.mars_hidden_mission_catalog%rowtype;
  v_existing public.builder_mars_hidden_missions%rowtype;
  v_slot bigint;
  v_target_x double precision;
  v_target_z double precision;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.assert_my_mars_access();

  v_cycle_key :=
    to_char(
      timezone('UTC', now()),
      'YYYY-MM-DD'
    );

  perform pg_advisory_xact_lock(
    hashtext(
      'ares-personal-mission:' ||
      v_cycle_key
    )
  );

  select bm.*
  into v_existing
  from public.builder_mars_hidden_missions bm
  where
    bm.builder_id = v_builder_id
    and bm.cycle_key = v_cycle_key
    and bm.status = 'accepted'
  order by bm.accepted_at desc
  limit 1;

  if found then
    return query
    select
      c.mission_key,
      c.title,
      c.briefing,
      coalesce(
        v_existing.assigned_target_x,
        c.target_x
      ),
      coalesce(
        v_existing.assigned_target_z,
        c.target_z
      ),
      c.target_radius,
      c.reward_gp,
      v_existing.cycle_key,
      v_existing.status,
      v_existing.accepted_at,
      false
    from public.mars_hidden_mission_catalog c
    where
      c.mission_key =
        v_existing.mission_key
      and c.enabled = true;

    return;
  end if;

  select c.*
  into v_catalog
  from public.mars_hidden_mission_catalog c
  where
    c.sector_key = 'ares'
    and c.enabled = true
    and not exists (
      select 1
      from public.builder_mars_hidden_missions bm
      where
        bm.builder_id = v_builder_id
        and bm.cycle_key = v_cycle_key
        and bm.mission_key = c.mission_key
    )
  order by
    (
      select count(*)
      from public.builder_mars_hidden_missions usage
      where
        usage.cycle_key = v_cycle_key
        and usage.mission_key =
          c.mission_key
    ),
    c.mission_key
  limit 1;

  if not found then
    raise exception
      'All Ares missions completed for this cycle';
  end if;

  select count(*)::bigint
  into v_slot
  from public.builder_mars_hidden_missions bm
  where
    bm.cycle_key = v_cycle_key;

  v_target_x :=
    v_catalog.target_x +
    mod(
      v_slot,
      5
    ) * 7;

  v_target_z :=
    v_catalog.target_z +
    mod(
      floor(v_slot / 5.0)::bigint,
      5
    ) * 7;

  insert into public.builder_mars_hidden_missions (
    builder_id,
    mission_key,
    cycle_key,
    status,
    assigned_target_x,
    assigned_target_z,
    metadata
  )
  values (
    v_builder_id,
    v_catalog.mission_key,
    v_cycle_key,
    'accepted',
    v_target_x,
    v_target_z,
    jsonb_build_object(
      'source',
      'ares_command_hub_terminal',
      'assignment',
      'personal_ares_mission_v2',
      'slot',
      v_slot
    )
  )
  returning *
  into v_existing;

  return query
  select
    v_catalog.mission_key,
    v_catalog.title,
    v_catalog.briefing,
    v_existing.assigned_target_x,
    v_existing.assigned_target_z,
    v_catalog.target_radius,
    v_catalog.reward_gp,
    v_existing.cycle_key,
    v_existing.status,
    v_existing.accepted_at,
    true;
end;
$$;

revoke all
on function public.get_my_ares_hidden_mission()
from public, anon;

grant execute
on function public.get_my_ares_hidden_mission()
to authenticated;

revoke all
on function public.access_my_ares_mission_terminal()
from public, anon;

grant execute
on function public.access_my_ares_mission_terminal()
to authenticated;

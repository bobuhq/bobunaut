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
    and c.sector_key = 'ares'
    and c.enabled = true
  order by
    case
      when m.status = 'accepted' then 0
      else 1
    end,
    m.accepted_at asc
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
      'ares-one-mission:' ||
      v_builder_id::text ||
      ':' ||
      v_cycle_key
    )
  );

  select bm.*
  into v_existing
  from public.builder_mars_hidden_missions bm
  where
    bm.builder_id = v_builder_id
    and bm.cycle_key = v_cycle_key
  order by
    case
      when bm.status = 'accepted' then 0
      else 1
    end,
    bm.accepted_at asc
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
      c.mission_key = v_existing.mission_key
      and c.enabled = true;

    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtext(
      'ares-assignment:' ||
      v_cycle_key
    )
  );

  select count(*)::bigint
  into v_slot
  from public.builder_mars_hidden_missions bm
  where
    bm.cycle_key = v_cycle_key;

  select c.*
  into v_catalog
  from public.mars_hidden_mission_catalog c
  where
    c.sector_key = 'ares'
    and c.enabled = true
  order by
    (
      select count(*)
      from public.builder_mars_hidden_missions usage
      where
        usage.cycle_key = v_cycle_key
        and usage.mission_key = c.mission_key
    ),
    c.mission_key
  limit 1;

  if not found then
    raise exception 'No active Ares mission available';
  end if;

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
      'one_personal_ares_mission_v3',
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

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

  select m.*
  into v_existing
  from public.builder_mars_hidden_missions as m
  where
    m.builder_id = v_builder_id
    and m.cycle_key = v_cycle_key
  order by m.accepted_at desc
  limit 1;

  if found then
    return query
    select
      c.mission_key,
      c.title,
      c.briefing,
      c.target_x,
      c.target_z,
      c.target_radius,
      c.reward_gp,
      v_existing.cycle_key,
      v_existing.status,
      v_existing.accepted_at,
      false
    from public.mars_hidden_mission_catalog as c
    where
      c.mission_key = v_existing.mission_key
      and c.sector_key = 'ares'
      and c.enabled = true;

    return;
  end if;

  select c.*
  into v_catalog
  from public.mars_hidden_mission_catalog as c
  where
    c.sector_key = 'ares'
    and c.enabled = true
  order by c.mission_key
  limit 1;

  if not found then
    raise exception 'No active Ares mission available';
  end if;

  insert into public.builder_mars_hidden_missions (
    builder_id,
    mission_key,
    cycle_key,
    status,
    metadata
  )
  values (
    v_builder_id,
    v_catalog.mission_key,
    v_cycle_key,
    'accepted',
    jsonb_build_object(
      'source',
      'ares_command_hub_terminal'
    )
  )
  returning *
  into v_existing;

  return query
  select
    v_catalog.mission_key,
    v_catalog.title,
    v_catalog.briefing,
    v_catalog.target_x,
    v_catalog.target_z,
    v_catalog.target_radius,
    v_catalog.reward_gp,
    v_existing.cycle_key,
    v_existing.status,
    v_existing.accepted_at,
    true;
end;
$$;

revoke all
on function public.access_my_ares_mission_terminal()
from public, anon;

grant execute
on function public.access_my_ares_mission_terminal()
to authenticated;

comment on function public.access_my_ares_mission_terminal()
is 'Server-authoritative Ares Command Hub terminal access with qualified mission catalog and Builder mission references.';

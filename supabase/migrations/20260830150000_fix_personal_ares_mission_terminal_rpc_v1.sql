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
      'ares-hidden-mission:' ||
      v_cycle_key
    )
  );

  select bm.*
  into v_existing
  from public.builder_mars_hidden_missions bm
  where
    bm.builder_id = v_builder_id
    and bm.cycle_key = v_cycle_key
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
  order by c.mission_key
  limit 1;

  if not found then
    raise exception
      'No active Ares mission available';
  end if;

  select count(*)::bigint
  into v_slot
  from public.builder_mars_hidden_missions bm
  where
    bm.cycle_key = v_cycle_key;

  v_slot :=
    mod(
      v_slot,
      256
    );

  v_target_x :=
    -92 +
    (
      mod(
        v_slot,
        16
      ) - 7.5
    ) * 16;

  v_target_z :=
    44 +
    (
      mod(
        floor(
          v_slot / 16.0
        )::bigint,
        16
      ) - 7.5
    ) * 16;

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
      'personal_ares_signal_v1',
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
on function public.access_my_ares_mission_terminal()
from public, anon;

grant execute
on function public.access_my_ares_mission_terminal()
to authenticated;

comment on function public.access_my_ares_mission_terminal()
is 'Assigns one server-authoritative personal Ares signal location to each Builder per UTC cycle.';

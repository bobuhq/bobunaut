alter table public.builder_mars_hidden_missions
add column if not exists scan_started_at timestamptz;

create or replace function public.start_my_ares_hidden_mission_scan(
  p_mission_key text
)
returns table (
  mission_key text,
  cycle_key text,
  scan_started_at timestamptz,
  earliest_complete_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
  v_cycle_key text;
  v_mission public.builder_mars_hidden_missions%rowtype;
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
  into v_mission
  from public.builder_mars_hidden_missions as m
  join public.mars_hidden_mission_catalog as c
    on c.mission_key = m.mission_key
  where
    m.builder_id = v_builder_id
    and m.mission_key = p_mission_key
    and m.cycle_key = v_cycle_key
    and m.status = 'accepted'
    and c.sector_key = 'ares'
    and c.enabled = true
  for update of m
  limit 1;

  if not found then
    raise exception 'Active Ares mission not found';
  end if;

  if v_mission.scan_started_at is null then
    update public.builder_mars_hidden_missions as m
    set
      scan_started_at = now(),
      metadata =
        coalesce(m.metadata, '{}'::jsonb) ||
        jsonb_build_object(
          'scan_started_from',
          'ares_surface_signal'
        )
    where
      m.id = v_mission.id
    returning m.*
    into v_mission;
  end if;

  return query
  select
    v_mission.mission_key,
    v_mission.cycle_key,
    v_mission.scan_started_at,
    v_mission.scan_started_at +
      interval '3 seconds';
end;
$$;

create or replace function public.complete_my_ares_hidden_mission(
  p_mission_key text
)
returns table (
  completed_now boolean,
  mission_key text,
  cycle_key text,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
  v_cycle_key text;
  v_mission public.builder_mars_hidden_missions%rowtype;
  v_catalog public.mars_hidden_mission_catalog%rowtype;
  v_award record;
  v_total_gp bigint;
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

  select
    m.*
  into v_mission
  from public.builder_mars_hidden_missions as m
  where
    m.builder_id = v_builder_id
    and m.mission_key = p_mission_key
    and m.cycle_key = v_cycle_key
  for update
  limit 1;

  if not found then
    raise exception 'Ares mission not found';
  end if;

  select
    c.*
  into v_catalog
  from public.mars_hidden_mission_catalog as c
  where
    c.mission_key = v_mission.mission_key
    and c.sector_key = 'ares'
    and c.enabled = true
  limit 1;

  if not found then
    raise exception 'Ares mission catalog entry unavailable';
  end if;

  if v_mission.status in ('completed', 'claimed') then
    select
      bp.gp
    into v_total_gp
    from public.builder_profiles as bp
    where
      bp.builder_id = v_builder_id;

    return query
    select
      false,
      v_mission.mission_key,
      v_mission.cycle_key,
      v_catalog.reward_gp,
      coalesce(v_total_gp, 0),
      null::uuid,
      v_mission.status,
      v_mission.completed_at;

    return;
  end if;

  if v_mission.scan_started_at is null then
    raise exception 'Mission scan has not started';
  end if;

  if now() <
    v_mission.scan_started_at +
      interval '3 seconds'
  then
    raise exception 'Mission scan is still in progress';
  end if;

  select *
  into v_award
  from public.award_builder_gp(
    v_builder_id,
    'mars_mission',
    v_catalog.reward_gp,
    'mars-hidden-mission:' ||
      v_mission.mission_key ||
      ':' ||
      v_mission.cycle_key,
    'mars',
    jsonb_build_object(
      'mission_key',
      v_mission.mission_key,
      'cycle_key',
      v_mission.cycle_key,
      'sector',
      'ares',
      'source',
      'ares_hidden_mission'
    )
  );

  update public.builder_mars_hidden_missions as m
  set
    status = 'claimed',
    completed_at = now(),
    claimed_at = now(),
    metadata =
      coalesce(m.metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'completion_source',
        'ares_surface_scan'
      )
  where
    m.id = v_mission.id
  returning m.*
  into v_mission;

  return query
  select
    true,
    v_mission.mission_key,
    v_mission.cycle_key,
    v_catalog.reward_gp,
    v_award.total_gp,
    v_award.ledger_id,
    v_mission.status,
    v_mission.completed_at;
end;
$$;

revoke all
on function public.start_my_ares_hidden_mission_scan(text)
from public, anon;

grant execute
on function public.start_my_ares_hidden_mission_scan(text)
to authenticated;

revoke all
on function public.complete_my_ares_hidden_mission(text)
from public, anon;

grant execute
on function public.complete_my_ares_hidden_mission(text)
to authenticated;

comment on function public.start_my_ares_hidden_mission_scan(text)
is 'Starts the authenticated Builder current Ares hidden mission scan and records the server scan start time.';

comment on function public.complete_my_ares_hidden_mission(text)
is 'Completes the authenticated Builder current Ares hidden mission after the minimum server scan duration and awards GP idempotently.';

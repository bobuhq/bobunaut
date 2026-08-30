create table if not exists public.builder_mars_research (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references public.builder_profiles(builder_id)
    on delete cascade,

  hidden_mission_id uuid not null
    references public.builder_mars_hidden_missions(id)
    on delete cascade,

  mission_key text not null,

  cycle_key text not null,

  sector_key text not null default 'ares',

  status text not null default 'ready'
    check (
      status in (
        'ready',
        'analyzing',
        'completed'
      )
    ),

  analysis_started_at timestamptz,

  completed_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (
    builder_id,
    hidden_mission_id
  )
);

alter table public.builder_mars_research
enable row level security;

revoke all
on public.builder_mars_research
from public, anon, authenticated;

grant select
on public.builder_mars_research
to authenticated;

drop policy if exists
  "Builders can read own Mars research"
on public.builder_mars_research;

create policy
  "Builders can read own Mars research"
on public.builder_mars_research
for select
to authenticated
using (
  builder_id = auth.uid()
);

create or replace function public.get_my_ares_research()
returns table (
  research_id uuid,
  mission_key text,
  title text,
  cycle_key text,
  status text,
  analysis_started_at timestamptz,
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
    and m.cycle_key = v_cycle_key
    and m.status = 'claimed'
    and c.sector_key = 'ares'
    and c.enabled = true
  order by m.accepted_at asc
  limit 1;

  if not found then
    return;
  end if;

  insert into public.builder_mars_research (
    builder_id,
    hidden_mission_id,
    mission_key,
    cycle_key,
    sector_key,
    status,
    metadata
  )
  values (
    v_builder_id,
    v_mission.id,
    v_mission.mission_key,
    v_mission.cycle_key,
    'ares',
    'ready',
    jsonb_build_object(
      'source',
      'ares_hidden_mission'
    )
  )
  on conflict (
    builder_id,
    hidden_mission_id
  )
  do nothing;

  return query
  select
    r.id,
    r.mission_key,
    c.title,
    r.cycle_key,
    r.status,
    r.analysis_started_at,
    r.completed_at
  from public.builder_mars_research as r
  join public.mars_hidden_mission_catalog as c
    on c.mission_key = r.mission_key
  where
    r.builder_id = v_builder_id
    and r.hidden_mission_id = v_mission.id
  limit 1;
end;
$$;

create or replace function public.start_my_ares_research(
  p_mission_key text
)
returns table (
  research_id uuid,
  mission_key text,
  status text,
  analysis_started_at timestamptz,
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
  v_research public.builder_mars_research%rowtype;
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
    and m.status = 'claimed'
    and c.sector_key = 'ares'
    and c.enabled = true
  limit 1;

  if not found then
    raise exception 'Completed Ares discovery not found';
  end if;

  insert into public.builder_mars_research (
    builder_id,
    hidden_mission_id,
    mission_key,
    cycle_key,
    sector_key,
    status,
    metadata
  )
  values (
    v_builder_id,
    v_mission.id,
    v_mission.mission_key,
    v_mission.cycle_key,
    'ares',
    'ready',
    jsonb_build_object(
      'source',
      'ares_research_terminal'
    )
  )
  on conflict (
    builder_id,
    hidden_mission_id
  )
  do nothing;

  select r.*
  into v_research
  from public.builder_mars_research as r
  where
    r.builder_id = v_builder_id
    and r.hidden_mission_id = v_mission.id
  for update;

  if v_research.status = 'completed' then
    return query
    select
      v_research.id,
      v_research.mission_key,
      v_research.status,
      v_research.analysis_started_at,
      v_research.completed_at;

    return;
  end if;

  if v_research.analysis_started_at is null then
    update public.builder_mars_research as r
    set
      status = 'analyzing',
      analysis_started_at = now(),
      metadata =
        coalesce(r.metadata, '{}'::jsonb) ||
        jsonb_build_object(
          'analysis_source',
          'ares_research_terminal'
        )
    where r.id = v_research.id
    returning r.*
    into v_research;
  end if;

  return query
  select
    v_research.id,
    v_research.mission_key,
    v_research.status,
    v_research.analysis_started_at,
    v_research.analysis_started_at +
      interval '4 seconds';
end;
$$;

create or replace function public.complete_my_ares_research(
  p_mission_key text
)
returns table (
  completed_now boolean,
  research_id uuid,
  mission_key text,
  cycle_key text,
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
  v_research public.builder_mars_research%rowtype;
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

  select r.*
  into v_research
  from public.builder_mars_research as r
  join public.builder_mars_hidden_missions as m
    on m.id = r.hidden_mission_id
  where
    r.builder_id = v_builder_id
    and r.mission_key = p_mission_key
    and r.cycle_key = v_cycle_key
    and r.sector_key = 'ares'
    and m.builder_id = v_builder_id
    and m.status = 'claimed'
  for update of r
  limit 1;

  if not found then
    raise exception 'Ares research not found';
  end if;

  if v_research.status = 'completed' then
    return query
    select
      false,
      v_research.id,
      v_research.mission_key,
      v_research.cycle_key,
      v_research.status,
      v_research.completed_at;

    return;
  end if;

  if v_research.analysis_started_at is null then
    raise exception 'Research analysis has not started';
  end if;

  if now() <
    v_research.analysis_started_at +
      interval '4 seconds'
  then
    raise exception 'Research analysis is still in progress';
  end if;

  update public.builder_mars_research as r
  set
    status = 'completed',
    completed_at = now(),
    metadata =
      coalesce(r.metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'completion_source',
        'ares_research_terminal'
      )
  where r.id = v_research.id
  returning r.*
  into v_research;

  return query
  select
    true,
    v_research.id,
    v_research.mission_key,
    v_research.cycle_key,
    v_research.status,
    v_research.completed_at;
end;
$$;

revoke all
on function public.get_my_ares_research()
from public, anon;

grant execute
on function public.get_my_ares_research()
to authenticated;

revoke all
on function public.start_my_ares_research(text)
from public, anon;

grant execute
on function public.start_my_ares_research(text)
to authenticated;

revoke all
on function public.complete_my_ares_research(text)
from public, anon;

grant execute
on function public.complete_my_ares_research(text)
to authenticated;

comment on table public.builder_mars_research
is 'Server-authoritative Builder research records generated from completed Mars exploration discoveries.';

comment on function public.get_my_ares_research()
is 'Returns or prepares the authenticated Builder current UTC-cycle Ares research record from a claimed hidden mission.';

comment on function public.start_my_ares_research(text)
is 'Starts server-authoritative analysis for a claimed Ares discovery.';

comment on function public.complete_my_ares_research(text)
is 'Completes Ares research after the minimum server-authoritative analysis duration.';

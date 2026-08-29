create table if not exists public.mars_hidden_mission_catalog (
  mission_key text primary key,
  sector_key text not null,
  title text not null,
  briefing text not null,
  target_x double precision not null,
  target_z double precision not null,
  target_radius double precision not null check (target_radius > 0),
  reward_gp bigint not null check (reward_gp >= 50),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_mars_hidden_missions (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid not null references public.builder_profiles(builder_id) on delete cascade,
  mission_key text not null references public.mars_hidden_mission_catalog(mission_key),
  cycle_key text not null,
  status text not null default 'accepted'
    check (status in ('accepted', 'completed', 'claimed')),
  accepted_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (builder_id, mission_key, cycle_key)
);

alter table public.mars_hidden_mission_catalog enable row level security;
alter table public.builder_mars_hidden_missions enable row level security;

revoke all on public.mars_hidden_mission_catalog
from public, anon, authenticated;

revoke insert, update, delete
on public.builder_mars_hidden_missions
from public, anon, authenticated;

grant select
on public.builder_mars_hidden_missions
to authenticated;

drop policy if exists
  "Builders can read own hidden Mars missions"
on public.builder_mars_hidden_missions;

create policy
  "Builders can read own hidden Mars missions"
on public.builder_mars_hidden_missions
for select
to authenticated
using (builder_id = auth.uid());

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
values (
  'ares-echo-01',
  'ares',
  'Echo Beneath Ares',
  'Command sensors detected a repeating subsurface signal beyond the primary survey zone. Reach the coordinates and investigate the source.',
  -92,
  44,
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
    c.target_x,
    c.target_z,
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

  select *
  into v_existing
  from public.builder_mars_hidden_missions
  where
    builder_id = v_builder_id
    and cycle_key = v_cycle_key
  order by accepted_at desc
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
    from public.mars_hidden_mission_catalog c
    where
      c.mission_key = v_existing.mission_key
      and c.enabled = true;

    return;
  end if;

  select *
  into v_catalog
  from public.mars_hidden_mission_catalog
  where
    sector_key = 'ares'
    and enabled = true
  order by mission_key
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

comment on function public.get_my_ares_hidden_mission()
is 'Returns the authenticated Builder current UTC-cycle Ares hidden mission without exposing the mission catalog.';

comment on function public.access_my_ares_mission_terminal()
is 'Server-authoritative Command Hub terminal access. Accepts at most one enabled Ares hidden mission for the authenticated Builder per UTC cycle.';

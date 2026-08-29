begin;

create table if not exists public.mars_command_hub_progression (
  command_hub_level integer primary key
    check (command_hub_level >= 1),

  map_min integer not null,
  map_max integer not null,

  max_other_building_level integer not null
    check (max_other_building_level >= 1),

  market_tier integer not null
    check (market_tier >= 1),

  created_at timestamptz not null default now(),

  constraint mars_command_hub_progression_bounds_check
    check (
      map_min < map_max
      and map_min <= 0
      and map_max >= 0
    )
);

insert into public.mars_command_hub_progression (
  command_hub_level,
  map_min,
  map_max,
  max_other_building_level,
  market_tier
)
values
  (1, -6,  6, 1, 1),
  (2, -8,  8, 2, 2),
  (3, -10, 10, 3, 3),
  (4, -12, 12, 4, 4),
  (5, -14, 14, 5, 5),
  (6, -16, 16, 6, 6),
  (7, -18, 18, 7, 7),
  (8, -20, 20, 8, 8),
  (9, -22, 22, 9, 9),
  (10, -24, 24, 10, 10)
on conflict (command_hub_level)
do update
set
  map_min = excluded.map_min,
  map_max = excluded.map_max,
  max_other_building_level =
    excluded.max_other_building_level,
  market_tier = excluded.market_tier;

alter table public.mars_command_hub_progression
  enable row level security;

revoke all
on table public.mars_command_hub_progression
from public, anon;

grant select
on table public.mars_command_hub_progression
to authenticated;

drop policy if exists
  mars_command_hub_progression_authenticated_read
on public.mars_command_hub_progression;

create policy
  mars_command_hub_progression_authenticated_read
on public.mars_command_hub_progression
for select
to authenticated
using (true);


create or replace function
public.get_mars_command_hub_progression_for_colony(
  p_colony_id uuid
)
returns table (
  command_hub_level integer,
  map_min integer,
  map_max integer,
  max_other_building_level integer,
  market_tier integer
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_hub_level integer;
  v_map_min integer;
  v_map_max integer;
  v_max_other_building_level integer;
  v_market_tier integer;
begin
  if p_colony_id is null then
    raise exception 'COLONY_REQUIRED'
      using errcode = '22023';
  end if;

  select building.level
  into v_hub_level
  from public.mars_colony_buildings building
  where building.colony_id = p_colony_id
    and building.building_key = 'command_hub'
    and building.status = 'active'
  order by building.level desc
  limit 1;

  if v_hub_level is null then
    raise exception 'COMMAND_HUB_REQUIRED'
      using errcode = 'P0002';
  end if;

  select
    progression.map_min,
    progression.map_max,
    progression.max_other_building_level,
    progression.market_tier
  into
    v_map_min,
    v_map_max,
    v_max_other_building_level,
    v_market_tier
  from public.mars_command_hub_progression progression
  where progression.command_hub_level = v_hub_level;

  if not found then
    raise exception 'COMMAND_HUB_PROGRESSION_NOT_CONFIGURED'
      using errcode = '22023';
  end if;

  return query
  select
    v_hub_level,
    v_map_min,
    v_map_max,
    v_max_other_building_level,
    v_market_tier;
end;
$$;

revoke all
on function
public.get_mars_command_hub_progression_for_colony(uuid)
from public, anon, authenticated;

grant execute
on function
public.get_mars_command_hub_progression_for_colony(uuid)
to authenticated;


comment on table public.mars_command_hub_progression is
'Server-authoritative BOBU Mars progression policy. Command Hub level controls colony bounds, other-building upgrade ceiling, and Market tier.';

comment on function
public.get_mars_command_hub_progression_for_colony(uuid) is
'Returns authoritative Mars Colony progression limits derived from the active Command Hub level.';

commit;

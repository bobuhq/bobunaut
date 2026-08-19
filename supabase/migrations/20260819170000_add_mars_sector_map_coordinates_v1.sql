begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Sector Map Coordinates v1
--
-- Persistent map coordinates for the interactive Mars Map.
-- Coordinates are normalized percentages (0..100).
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

alter table public.mars_sectors
  add column if not exists map_x numeric(5,2),
  add column if not exists map_y numeric(5,2);

alter table public.mars_sectors
  drop constraint if exists mars_sectors_map_x_range;

alter table public.mars_sectors
  add constraint mars_sectors_map_x_range
  check (
    map_x is null or
    (map_x >= 0 and map_x <= 100)
  );

alter table public.mars_sectors
  drop constraint if exists mars_sectors_map_y_range;

alter table public.mars_sectors
  add constraint mars_sectors_map_y_range
  check (
    map_y is null or
    (map_y >= 0 and map_y <= 100)
  );

-- Initial operational map layout.
-- These positions are UI coordinates, not scientific
-- latitude / longitude values.

update public.mars_sectors
set map_x = 28, map_y = 30
where sector_code = 'ARCADIA';

update public.mars_sectors
set map_x = 50, map_y = 39
where sector_code = 'ARES';

update public.mars_sectors
set map_x = 73, map_y = 28
where sector_code = 'ELYSIUM';

update public.mars_sectors
set map_x = 67, map_y = 69
where sector_code = 'HELLAS';

update public.mars_sectors
set map_x = 35, map_y = 67
where sector_code = 'VALLES';

update public.mars_sectors
set map_x = 79, map_y = 51
where sector_code = 'UTOPIA';


drop function if exists public.get_mars_sector_directory();

create function public.get_mars_sector_directory()
returns table (
  sector_id uuid,
  sector_code text,
  sector_name text,
  sector_status text,
  max_colonies bigint,
  current_colonies bigint,
  total_contribution bigint,
  map_x numeric,
  map_y numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.sector_code,
    s.name,
    s.status,
    s.max_colonies,
    s.current_colonies,
    s.total_contribution,
    s.map_x,
    s.map_y
  from public.mars_sectors s
  where auth.uid() is not null
    and s.status = 'active'
  order by
    s.current_colonies asc,
    s.name asc;
$$;

revoke all
on function public.get_mars_sector_directory()
from public, anon, authenticated;

grant execute
on function public.get_mars_sector_directory()
to authenticated;

comment on column public.mars_sectors.map_x is
'Normalized horizontal position for BUILD MARS interactive map.';

comment on column public.mars_sectors.map_y is
'Normalized vertical position for BUILD MARS interactive map.';

comment on function public.get_mars_sector_directory() is
'Returns active BUILD MARS Sectors including persistent interactive map coordinates.';

commit;

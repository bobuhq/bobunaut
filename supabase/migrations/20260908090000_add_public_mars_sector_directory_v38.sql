begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Public Sector Directory v38
--
-- Public, read-only sector metadata for the Mars globe.
-- Allows signed-out visitors to see Sector Network and
-- public Mars Pixel advertising without exposing private
-- colony / Builder / Ares access data.
--
-- Existing authenticated RPC remains unchanged.
-- ============================================================

create or replace function public.get_public_mars_sector_directory_v1()
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
  where s.status = 'active'
  order by
    s.current_colonies asc,
    s.name asc;
$$;

revoke all
on function public.get_public_mars_sector_directory_v1()
from public, anon, authenticated;

grant execute
on function public.get_public_mars_sector_directory_v1()
to anon, authenticated;

comment on function public.get_public_mars_sector_directory_v1() is
'Returns public read-only BUILD MARS sector metadata required by the Mars globe. Contains no Builder, colony ownership, or Ares access data.';

commit;

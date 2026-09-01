begin;

create or replace function public.get_mars_pixel_public_reserved_zones()
returns table (
  zone_code text,
  zone_name text,
  reservation_type text,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  permanent boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    zone.zone_code,
    zone.zone_name,
    zone.reservation_type,
    zone.x_start,
    zone.y_start,
    zone.width,
    zone.height,
    zone.permanent
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
  order by
    zone.y_start,
    zone.x_start,
    zone.zone_code;
$$;

revoke all
on function public.get_mars_pixel_public_reserved_zones()
from public;

grant execute
on function public.get_mars_pixel_public_reserved_zones()
to anon, authenticated;

comment on function public.get_mars_pixel_public_reserved_zones() is
'Read-only public geometry for active Mars Pixel Network reserved zones. No ownership, mutation, payment, or purchase capability.';

commit;

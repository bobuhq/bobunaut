revoke all
on function public.get_my_mars_pixel_creative_v1(uuid)
from public, anon;

grant execute
on function public.get_my_mars_pixel_creative_v1(uuid)
to authenticated, service_role;

comment on function public.get_my_mars_pixel_creative_v1(uuid) is
'Authenticated owner-only Mars Pixel creative detail. Anonymous execution is explicitly denied.';

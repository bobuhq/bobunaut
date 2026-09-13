begin;

-- Admin mutation RPCs
revoke execute on function public.admin_edit_mars_pixel_creative_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
) from anon;

revoke execute on function public.admin_manage_mars_pixel_allocation_v1(
  uuid,
  text,
  text
) from anon;

revoke execute on function public.moderate_mars_pixel_creative_v1(
  uuid,
  text
) from anon;

-- Admin read RPCs
revoke execute on function public.get_admin_mars_pixel_allocations_v1(
  integer,
  integer
) from anon;

revoke execute on function public.get_admin_mars_pixel_creatives_v1(
  text,
  integer,
  integer
) from anon;

commit;

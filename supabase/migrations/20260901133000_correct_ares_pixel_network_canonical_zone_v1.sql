begin;

do $$
declare
  v_grid_version integer;
begin
  select config.grid_version
  into v_grid_version
  from public.mars_pixel_network_config as config
  where config.id = 1;

  if not found then
    raise exception
      'Mars Pixel Network configuration does not exist.';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and allocation.x_start < 550
      and allocation.x_start + allocation.width > 500
      and allocation.y_start < 400
      and allocation.y_start + allocation.height > 350
  ) then
    raise exception
      'Canonical ARES protected zone overlaps an existing owned allocation.';
  end if;

  update public.mars_pixel_reserved_zones
  set
    x_start = 500,
    y_start = 350,
    width = 50,
    height = 50,
    zone_name = 'Ares Sector',
    reservation_type = 'protected',
    permanent = true,
    active = true,
    updated_at = now()
  where zone_code = 'ARES_PROTECTED'
    and x_start = 500
    and y_start = 600
    and width = 50
    and height = 50
    and permanent = true
    and active = true;

  if not found then
    raise exception
      'Expected previous ARES_PROTECTED zone was not found; refusing unsafe correction.';
  end if;

  if not exists (
    select 1
    from public.mars_pixel_reserved_zones
    where zone_code = 'ARES_PROTECTED'
      and zone_name = 'Ares Sector'
      and reservation_type = 'protected'
      and x_start = 500
      and y_start = 350
      and width = 50
      and height = 50
      and permanent = true
      and active = true
  ) then
    raise exception
      'Canonical ARES_PROTECTED correction failed.';
  end if;
end;
$$;

commit;

begin;

do $$
declare
  v_map_x numeric;
  v_map_y numeric;
  v_grid_width integer;
  v_grid_height integer;
  v_grid_version integer;
  v_major_grid integer := 20;
  v_major_x integer;
  v_major_y integer;
  v_x_start integer;
  v_y_start integer;
  v_width integer;
  v_height integer;
begin
  select
    sector.map_x,
    sector.map_y
  into
    v_map_x,
    v_map_y
  from public.mars_sectors as sector
  where sector.sector_code = 'ARES';

  if not found then
    raise exception
      'ARES sector does not exist.';
  end if;

  if v_map_x is null or v_map_y is null then
    raise exception
      'ARES map coordinates are not configured.';
  end if;

  select
    config.grid_width,
    config.grid_height,
    config.grid_version
  into
    v_grid_width,
    v_grid_height,
    v_grid_version
  from public.mars_pixel_network_config as config
  where config.id = 1;

  if not found then
    raise exception
      'Mars Pixel Network configuration does not exist.';
  end if;

  if
    v_grid_width % v_major_grid <> 0
    or v_grid_height % v_major_grid <> 0
  then
    raise exception
      'Mars Pixel Network grid is incompatible with the 20x20 major grid.';
  end if;

  v_major_x :=
    least(
      19,
      floor(
        greatest(
          0,
          least(0.999999, v_map_x / 100)
        ) * v_major_grid
      )::integer
    );

  v_major_y :=
    least(
      19,
      floor(
        (
          1 -
          greatest(
            0,
            least(0.999999, v_map_y / 100)
          )
        ) * v_major_grid
      )::integer
    );

  v_width :=
    v_grid_width / v_major_grid;

  v_height :=
    v_grid_height / v_major_grid;

  v_x_start :=
    v_major_x * v_width;

  v_y_start :=
    v_major_y * v_height;

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and allocation.x_start < v_x_start + v_width
      and allocation.x_start + allocation.width > v_x_start
      and allocation.y_start < v_y_start + v_height
      and allocation.y_start + allocation.height > v_y_start
  ) then
    raise exception
      'ARES protected Pixel Network zone overlaps an existing owned allocation.';
  end if;

  insert into public.mars_pixel_reserved_zones (
    zone_code,
    zone_name,
    reservation_type,
    x_start,
    y_start,
    width,
    height,
    permanent,
    active
  )
  values (
    'ARES_PROTECTED',
    'Ares Sector',
    'protected',
    v_x_start,
    v_y_start,
    v_width,
    v_height,
    true,
    true
  )
  on conflict (zone_code)
  do update set
    zone_name = excluded.zone_name,
    reservation_type = excluded.reservation_type,
    x_start = excluded.x_start,
    y_start = excluded.y_start,
    width = excluded.width,
    height = excluded.height,
    permanent = true,
    active = true,
    updated_at = now();

  if
    v_x_start <> 500
    or v_y_start <> 600
    or v_width <> 50
    or v_height <> 50
  then
    raise exception
      'ARES canonical Pixel Network zone changed unexpectedly: x=%, y=%, width=%, height=%',
      v_x_start,
      v_y_start,
      v_width,
      v_height;
  end if;
end;
$$;

commit;

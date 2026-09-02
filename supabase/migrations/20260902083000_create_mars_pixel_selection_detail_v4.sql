begin;

create or replace function public.get_mars_pixel_selection_detail(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer
)
returns table (
  block_x_start integer,
  block_y_start integer,
  block_x_end integer,
  block_y_end integer,
  x_start integer,
  y_start integer,
  x_end integer,
  y_end integer,
  width integer,
  height integer,
  block_columns integer,
  block_rows integer,
  block_count integer,
  pixel_count integer,
  grid_version integer,
  selection_status text,
  purchasable boolean,
  reserved_overlap_count bigint,
  owned_overlap_count bigint,
  reserved_zone_code text,
  reserved_zone_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_grid_width integer;
  v_grid_height integer;
  v_grid_version integer;
  v_commercial_status text;
  v_block_size constant integer := 10;

  v_anchor_block_x integer;
  v_anchor_block_y integer;
  v_target_block_x integer;
  v_target_block_y integer;

  v_block_x_start integer;
  v_block_y_start integer;
  v_block_x_end integer;
  v_block_y_end integer;

  v_x_start integer;
  v_y_start integer;
  v_x_end integer;
  v_y_end integer;

  v_width integer;
  v_height integer;
  v_block_columns integer;
  v_block_rows integer;
  v_block_count integer;
  v_pixel_count integer;

  v_reserved_overlap_count bigint;
  v_owned_overlap_count bigint;
  v_reserved_zone_code text;
  v_reserved_zone_name text;
begin
  select
    config.grid_width,
    config.grid_height,
    config.grid_version,
    config.commercial_status
  into
    v_grid_width,
    v_grid_height,
    v_grid_version,
    v_commercial_status
  from public.mars_pixel_network_config as config
  where config.id = 1;

  if not found then
    raise exception
      'Mars Pixel Network configuration does not exist.';
  end if;

  if p_anchor_x is null
     or p_anchor_y is null
     or p_target_x is null
     or p_target_y is null
     or p_anchor_x < 0
     or p_anchor_y < 0
     or p_target_x < 0
     or p_target_y < 0
     or p_anchor_x >= v_grid_width
     or p_anchor_y >= v_grid_height
     or p_target_x >= v_grid_width
     or p_target_y >= v_grid_height then
    raise exception
      'Mars pixel selection is outside the canonical grid.';
  end if;

  if mod(v_grid_width, v_block_size) <> 0
     or mod(v_grid_height, v_block_size) <> 0 then
    raise exception
      'Mars Pixel Network grid is not compatible with the canonical block size.';
  end if;

  v_anchor_block_x :=
    floor(p_anchor_x::numeric / v_block_size)::integer;

  v_anchor_block_y :=
    floor(p_anchor_y::numeric / v_block_size)::integer;

  v_target_block_x :=
    floor(p_target_x::numeric / v_block_size)::integer;

  v_target_block_y :=
    floor(p_target_y::numeric / v_block_size)::integer;

  v_block_x_start :=
    least(v_anchor_block_x, v_target_block_x);

  v_block_y_start :=
    least(v_anchor_block_y, v_target_block_y);

  v_block_x_end :=
    greatest(v_anchor_block_x, v_target_block_x);

  v_block_y_end :=
    greatest(v_anchor_block_y, v_target_block_y);

  v_block_columns :=
    v_block_x_end - v_block_x_start + 1;

  v_block_rows :=
    v_block_y_end - v_block_y_start + 1;

  v_block_count :=
    v_block_columns * v_block_rows;

  v_x_start :=
    v_block_x_start * v_block_size;

  v_y_start :=
    v_block_y_start * v_block_size;

  v_x_end :=
    ((v_block_x_end + 1) * v_block_size) - 1;

  v_y_end :=
    ((v_block_y_end + 1) * v_block_size) - 1;

  v_width :=
    v_block_columns * v_block_size;

  v_height :=
    v_block_rows * v_block_size;

  v_pixel_count :=
    v_width * v_height;

  select
    count(*)
  into
    v_reserved_overlap_count
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_end + 1
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_end + 1
    and zone.y_start + zone.height > v_y_start;

  select
    zone.zone_code,
    zone.zone_name
  into
    v_reserved_zone_code,
    v_reserved_zone_name
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_end + 1
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_end + 1
    and zone.y_start + zone.height > v_y_start
  order by
    zone.permanent desc,
    zone.y_start,
    zone.x_start,
    zone.zone_code
  limit 1;

  select
    count(*)
  into
    v_owned_overlap_count
  from public.mars_pixel_allocations as allocation
  where allocation.grid_version = v_grid_version
    and allocation.allocation_status = 'owned'
    and allocation.x_start < v_x_end + 1
    and allocation.x_start + allocation.width > v_x_start
    and allocation.y_start < v_y_end + 1
    and allocation.y_start + allocation.height > v_y_start;

  return query
  select
    v_block_x_start,
    v_block_y_start,
    v_block_x_end,
    v_block_y_end,
    v_x_start,
    v_y_start,
    v_x_end,
    v_y_end,
    v_width,
    v_height,
    v_block_columns,
    v_block_rows,
    v_block_count,
    v_pixel_count,
    v_grid_version,
    case
      when v_reserved_overlap_count > 0
        then 'reserved'
      when v_owned_overlap_count > 0
        then 'owned'
      else 'available'
    end,
    (
      v_reserved_overlap_count = 0
      and v_owned_overlap_count = 0
      and v_commercial_status = 'active'
    ),
    v_reserved_overlap_count,
    v_owned_overlap_count,
    v_reserved_zone_code,
    v_reserved_zone_name;
end;
$$;

revoke all
on function public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
)
from public;

grant execute
on function public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
)
to anon, authenticated;

comment on function public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
) is
'Read-only server-authoritative validation for canonical Mars Pixel Network multi-block selections. No ownership, reservation, payment, checkout, or purchase mutation capability.';

commit;

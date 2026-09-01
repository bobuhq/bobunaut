begin;

create or replace function public.get_mars_pixel_block_at_coordinate(
  p_x integer,
  p_y integer
)
returns table (
  block_x integer,
  block_y integer,
  x_start integer,
  y_start integer,
  x_end integer,
  y_end integer,
  width integer,
  height integer,
  pixel_count integer,
  grid_version integer,
  block_status text,
  purchasable boolean,
  reserved_zone_code text,
  reserved_zone_name text,
  allocation_id uuid,
  advertiser_name text,
  creative_title text,
  creative_image_url text,
  destination_url text
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
  v_block_x integer;
  v_block_y integer;
  v_x_start integer;
  v_y_start integer;

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

  if p_x is null
     or p_y is null
     or p_x < 0
     or p_y < 0
     or p_x >= v_grid_width
     or p_y >= v_grid_height then
    raise exception
      'Mars pixel coordinate is outside the canonical grid.';
  end if;

  if mod(v_grid_width, v_block_size) <> 0
     or mod(v_grid_height, v_block_size) <> 0 then
    raise exception
      'Mars Pixel Network grid is not compatible with the canonical block size.';
  end if;

  v_block_x := floor(p_x::numeric / v_block_size)::integer;
  v_block_y := floor(p_y::numeric / v_block_size)::integer;

  v_x_start := v_block_x * v_block_size;
  v_y_start := v_block_y * v_block_size;

  return query
  with reserved_match as (
    select
      zone.zone_code,
      zone.zone_name
    from public.mars_pixel_reserved_zones as zone
    where zone.active = true
      and zone.x_start < v_x_start + v_block_size
      and zone.x_start + zone.width > v_x_start
      and zone.y_start < v_y_start + v_block_size
      and zone.y_start + zone.height > v_y_start
    limit 1
  ),
  allocation_match as (
    select
      allocation.id,
      allocation.advertiser_id
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and allocation.x_start < v_x_start + v_block_size
      and allocation.x_start + allocation.width > v_x_start
      and allocation.y_start < v_y_start + v_block_size
      and allocation.y_start + allocation.height > v_y_start
    limit 1
  ),
  advertiser_match as (
    select
      advertiser.display_name
    from allocation_match
    join public.mars_advertisers as advertiser
      on advertiser.id = allocation_match.advertiser_id
    limit 1
  ),
  creative_match as (
    select
      creative.title,
      creative.image_url,
      creative.destination_url
    from allocation_match
    join public.mars_ad_creatives as creative
      on creative.allocation_id = allocation_match.id
    where creative.active = true
    order by
      creative.updated_at desc,
      creative.created_at desc
    limit 1
  )
  select
    v_block_x,
    v_block_y,
    v_x_start,
    v_y_start,
    v_x_start + v_block_size - 1,
    v_y_start + v_block_size - 1,
    v_block_size,
    v_block_size,
    v_block_size * v_block_size,
    v_grid_version,
    case
      when reserved_match.zone_code is not null
        then 'reserved'
      when allocation_match.id is not null
        then 'owned'
      else 'available'
    end,
    (
      reserved_match.zone_code is null
      and allocation_match.id is null
      and v_commercial_status = 'active'
    ),
    reserved_match.zone_code,
    reserved_match.zone_name,
    allocation_match.id,
    advertiser_match.display_name,
    creative_match.title,
    creative_match.image_url,
    creative_match.destination_url
  from (select 1) as base
  left join reserved_match on true
  left join allocation_match on true
  left join advertiser_match on true
  left join creative_match on true;
end;
$$;

revoke all
on function public.get_mars_pixel_block_at_coordinate(integer, integer)
from public;

grant execute
on function public.get_mars_pixel_block_at_coordinate(integer, integer)
to anon, authenticated;

commit;

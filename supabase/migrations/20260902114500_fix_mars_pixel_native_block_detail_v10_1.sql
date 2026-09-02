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
set search_path = public, pg_temp
stable
as $$
declare
  v_grid_width integer;
  v_grid_height integer;
  v_grid_version integer;
  v_commercial_status text;
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
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  if p_x is null
     or p_y is null
     or p_x < 0
     or p_y < 0
     or p_x >= v_grid_width
     or p_y >= v_grid_height then
    raise exception 'MARS_PIXEL_COORDINATE_OUTSIDE_GRID'
      using errcode = '22023';
  end if;

  return query
  with reserved_match as (
    select
      zone.zone_code,
      zone.zone_name
    from public.mars_pixel_reserved_zones as zone
    where zone.active = true
      and p_x >= zone.x_start
      and p_x < zone.x_start + zone.width
      and p_y >= zone.y_start
      and p_y < zone.y_start + zone.height
    order by
      zone.permanent desc,
      zone.created_at asc
    limit 1
  ),
  allocation_match as (
    select
      allocation.id,
      allocation.advertiser_id
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and p_x >= allocation.x_start
      and p_x < allocation.x_start + allocation.width
      and p_y >= allocation.y_start
      and p_y < allocation.y_start + allocation.height
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
    where creative.status = 'active'
    order by
      creative.updated_at desc,
      creative.created_at desc
    limit 1
  )
  select
    p_x,
    p_y,
    p_x,
    p_y,
    p_x,
    p_y,
    1,
    1,
    1,
    v_grid_version,
    case
      when reserved_match.zone_code is not null then 'reserved'
      when allocation_match.id is not null then 'owned'
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
  from (select 1) as seed
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
to anon, authenticated, service_role;

comment on function public.get_mars_pixel_block_at_coordinate(integer, integer) is
'Pixel-native Mars Pixel detail lookup. One canonical coordinate equals exactly one Mars Pixel. Active creative metadata is sourced from mars_ad_creatives.';

commit;

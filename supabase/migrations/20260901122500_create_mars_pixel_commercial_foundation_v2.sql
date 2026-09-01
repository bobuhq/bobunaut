begin;

create or replace function public.get_mars_pixel_at_coordinate(
  p_x integer,
  p_y integer
)
returns table (
  x integer,
  y integer,
  grid_version integer,
  pixel_status text,
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
stable
security definer
set search_path = ''
as $$
declare
  v_config public.mars_pixel_network_config%rowtype;
begin
  select *
  into v_config
  from public.mars_pixel_network_config
  where id = 1;

  if not found then
    raise exception
      using
        errcode = '55000',
        message = 'Mars Pixel Network configuration is unavailable.';
  end if;

  if p_x is null
     or p_y is null
     or p_x < 0
     or p_y < 0
     or p_x >= v_config.grid_width
     or p_y >= v_config.grid_height then
    raise exception
      using
        errcode = '22023',
        message = 'Mars Pixel coordinate is outside the active grid.';
  end if;

  return query
  with reserved_match as (
    select
      zone.zone_code,
      zone.display_name
    from public.mars_pixel_reserved_zones as zone
    where zone.active = true
      and p_x >= zone.x_start
      and p_x < zone.x_start + zone.width
      and p_y >= zone.y_start
      and p_y < zone.y_start + zone.height
    limit 1
  ),
  allocation_match as (
    select
      allocation.id,
      advertiser.display_name as advertiser_name
    from public.mars_pixel_allocations as allocation
    join public.mars_advertisers as advertiser
      on advertiser.id = allocation.advertiser_id
    where allocation.grid_version = v_config.grid_version
      and allocation.allocation_status = 'owned'
      and p_x >= allocation.x_start
      and p_x < allocation.x_start + allocation.width
      and p_y >= allocation.y_start
      and p_y < allocation.y_start + allocation.height
    limit 1
  ),
  creative_match as (
    select
      creative.allocation_id,
      creative.title,
      creative.image_url,
      creative.destination_url
    from public.mars_ad_creatives as creative
    join allocation_match
      on allocation_match.id = creative.allocation_id
    where creative.status = 'active'
    order by creative.created_at desc
    limit 1
  )
  select
    p_x,
    p_y,
    v_config.grid_version,
    case
      when reserved_match.zone_code is not null then 'reserved'
      when allocation_match.id is not null then 'owned'
      else 'available'
    end,
    (
      reserved_match.zone_code is null
      and allocation_match.id is null
      and v_config.commercial_status = 'active'
    ),
    reserved_match.zone_code,
    reserved_match.display_name,
    allocation_match.id,
    allocation_match.advertiser_name,
    creative_match.title,
    creative_match.image_url,
    creative_match.destination_url
  from (select 1) as seed
  left join reserved_match on true
  left join allocation_match on true
  left join creative_match
    on creative_match.allocation_id = allocation_match.id;
end;
$$;

revoke all on function public.get_mars_pixel_at_coordinate(integer, integer)
from public;

grant execute on function public.get_mars_pixel_at_coordinate(integer, integer)
to anon, authenticated;

comment on function public.get_mars_pixel_at_coordinate(integer, integer) is
'Server-authoritative read-only Mars Pixel inspection endpoint. It exposes coordinate state without permitting reservation, allocation, ownership, payment, or commercial mutation.';

commit;

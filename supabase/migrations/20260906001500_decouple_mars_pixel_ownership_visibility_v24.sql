begin;

drop function if exists public.get_mars_pixel_public_allocations();

create function public.get_mars_pixel_public_allocations()
returns table (
  allocation_id uuid,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  advertiser_name text,
  creative_title text,
  creative_image_url text,
  color_key text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    allocation.id,
    allocation.x_start,
    allocation.y_start,
    allocation.width,
    allocation.height,

    case
      when advertiser.status = 'active'
        then advertiser.display_name
      else null
    end,

    case
      when advertiser.status = 'active'
        then creative.title
      else null
    end,

    case
      when advertiser.status = 'active'
        then creative.image_url
      else null
    end,

    allocation.color_key

  from public.mars_pixel_allocations as allocation

  join public.mars_advertisers as advertiser
    on advertiser.id = allocation.advertiser_id

  left join lateral (
    select
      candidate.title,
      candidate.image_url
    from public.mars_ad_creatives as candidate
    where candidate.allocation_id = allocation.id
      and candidate.status = 'active'
      and advertiser.status = 'active'
    order by candidate.created_at desc
    limit 1
  ) as creative
    on true

  where allocation.allocation_status = 'owned'
    and exists (
      select 1
      from public.mars_pixel_network_config as config
      where config.id = 1
        and config.commercial_status in ('preview', 'active')
    );
$$;

revoke all
on function public.get_mars_pixel_public_allocations()
from public;

grant execute
on function public.get_mars_pixel_public_allocations()
to anon, authenticated;

comment on function public.get_mars_pixel_public_allocations() is
'Public Mars Pixel owned territories. Ownership visibility is independent from advertiser moderation. Advertiser identity and creative content are exposed only for active advertisers.';

commit;

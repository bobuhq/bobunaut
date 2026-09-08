begin;

-- ============================================================
-- BOBU MARS PIXEL — PUBLIC ACTIVE CREATIVE LINKS V37
-- Exposes destination URL and CTA only from the latest ACTIVE
-- creative of an ACTIVE advertiser.
-- Ownership remains publicly visible independently of moderation.
-- ============================================================

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
  color_key text,
  destination_url text,
  cta_label text
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

    creative.title,
    creative.image_url,

    allocation.color_key,

    creative.destination_url,
    creative.cta_label

  from public.mars_pixel_allocations as allocation

  join public.mars_advertisers as advertiser
    on advertiser.id = allocation.advertiser_id

  left join lateral (
    select
      candidate.title,
      candidate.image_url,
      candidate.destination_url,
      candidate.cta_label
    from public.mars_ad_creatives as candidate
    where candidate.allocation_id = allocation.id
      and candidate.status = 'active'
      and advertiser.status = 'active'
    order by candidate.created_at desc
    limit 1
  ) as creative
    on true

  where allocation.allocation_status = 'owned';
$$;

revoke all
on function public.get_mars_pixel_public_allocations()
from public;

grant execute
on function public.get_mars_pixel_public_allocations()
to anon, authenticated;

comment on function public.get_mars_pixel_public_allocations() is
'Public Mars Pixel owned territories. Creative title, image, destination URL and CTA are exposed only from an active creative belonging to an active advertiser.';

commit;

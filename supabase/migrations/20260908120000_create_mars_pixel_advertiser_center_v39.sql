begin;

-- ============================================================
-- BOBU UNIVERSE
-- MARS PIXEL — Advertiser Center Foundation v39
--
-- Owner-only portfolio feed for the Mars Pixel Advertiser Center.
-- Returns every currently owned Mars Pixel territory belonging
-- to the authenticated Builder together with advertiser and
-- latest creative information.
--
-- No public access.
-- No payment, allocation, creative or moderation state is mutated.
-- ============================================================

create or replace function public.get_my_mars_pixel_advertiser_center_v1()
returns table (
  allocation_id uuid,
  advertiser_id uuid,
  advertiser_name text,
  advertiser_type text,
  advertiser_status text,

  allocation_status text,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  pixel_count bigint,
  color_key text,
  activated_at timestamptz,
  allocation_created_at timestamptz,

  creative_id uuid,
  creative_status text,
  creative_title text,
  creative_description text,
  creative_image_url text,
  creative_destination_url text,
  creative_cta_label text,
  creative_links jsonb,
  creative_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'MARS_PIXEL_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    allocation.id as allocation_id,
    advertiser.id as advertiser_id,
    advertiser.display_name as advertiser_name,
    advertiser.advertiser_type,
    advertiser.status as advertiser_status,

    allocation.allocation_status,
    allocation.x_start,
    allocation.y_start,
    allocation.width,
    allocation.height,
    (allocation.width::bigint * allocation.height::bigint) as pixel_count,
    allocation.color_key,
    allocation.activated_at,
    allocation.created_at as allocation_created_at,

    creative.id as creative_id,
    creative.status as creative_status,
    creative.title as creative_title,
    creative.description as creative_description,
    creative.image_url as creative_image_url,
    creative.destination_url as creative_destination_url,
    creative.cta_label as creative_cta_label,
    coalesce(creative.links, '[]'::jsonb) as creative_links,
    creative.updated_at as creative_updated_at

  from public.mars_pixel_allocations as allocation

  join public.mars_advertisers as advertiser
    on advertiser.id = allocation.advertiser_id

  left join lateral (
    select
      c.id,
      c.status,
      c.title,
      c.description,
      c.image_url,
      c.destination_url,
      c.cta_label,
      c.links,
      c.updated_at
    from public.mars_ad_creatives as c
    where c.allocation_id = allocation.id
    order by
      c.created_at desc,
      c.id desc
    limit 1
  ) as creative
    on true

  where advertiser.owner_builder_id = v_user_id
    and allocation.allocation_status = 'owned'

  order by
    allocation.created_at desc,
    allocation.id desc;
end;
$$;

revoke all
on function public.get_my_mars_pixel_advertiser_center_v1()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_pixel_advertiser_center_v1()
to authenticated;

comment on function public.get_my_mars_pixel_advertiser_center_v1() is
'Owner-only Mars Pixel Advertiser Center portfolio feed. Returns authenticated Builder owned territories and latest creative state without exposing other advertisers or mutating commercial state.';

commit;

begin;

create or replace function public.get_mars_pixel_content_tier_v1(
  p_pixel_count integer
)
returns table (
  tier_key text,
  min_pixels integer,
  max_pixels integer,
  territory_name_max_chars integer,
  description_max_chars integer,
  image_allowed boolean,
  max_links integer,
  cta_allowed boolean,
  socials_allowed boolean,
  analytics_allowed boolean,
  premium boolean
)
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_pixel_count is null or p_pixel_count < 50 then
    raise exception 'MARS_PIXEL_MINIMUM_50_PIXELS_REQUIRED'
      using errcode = '22023';
  end if;

  if p_pixel_count between 50 and 99 then
    return query
    select
      'TIER_50'::text,
      50,
      99,
      30,
      120,
      true,
      1,
      true,
      false,
      false,
      false;

  elsif p_pixel_count between 100 and 199 then
    return query
    select
      'TIER_100'::text,
      100,
      199,
      30,
      100,
      true,
      1,
      false,
      false,
      false,
      false;

  elsif p_pixel_count between 200 and 499 then
    return query
    select
      'TIER_200'::text,
      200,
      499,
      30,
      200,
      true,
      2,
      true,
      false,
      false,
      false;

  elsif p_pixel_count between 500 and 999 then
    return query
    select
      'TIER_500'::text,
      500,
      999,
      30,
      350,
      true,
      3,
      true,
      true,
      false,
      false;

  elsif p_pixel_count between 1000 and 4999 then
    return query
    select
      'TIER_1000'::text,
      1000,
      4999,
      30,
      500,
      true,
      5,
      true,
      true,
      true,
      false;

  else
    return query
    select
      'TIER_5000'::text,
      5000,
      null::integer,
      30,
      750,
      true,
      5,
      true,
      true,
      true,
      true;
  end if;
end;
$$;

revoke all
on function public.get_mars_pixel_content_tier_v1(integer)
from public;

grant execute
on function public.get_mars_pixel_content_tier_v1(integer)
to anon, authenticated, service_role;

comment on function public.get_mars_pixel_content_tier_v1(integer) is
'Canonical Mars Pixel Content Tier V1 rules. TIER_50 supports image, CTA and 120-character description. Tier capabilities are derived from server-authoritative pixel count.';

commit;

begin;

alter table public.mars_ad_creatives
  add column if not exists description text,
  add column if not exists cta_label text,
  add column if not exists links jsonb not null default '[]'::jsonb;

alter table public.mars_ad_creatives
  drop constraint if exists mars_ad_creatives_links_array_check;

alter table public.mars_ad_creatives
  add constraint mars_ad_creatives_links_array_check
  check (jsonb_typeof(links) = 'array');

alter table public.mars_ad_creatives
  drop constraint if exists mars_ad_creatives_cta_label_length_check;

alter table public.mars_ad_creatives
  add constraint mars_ad_creatives_cta_label_length_check
  check (
    cta_label is null
    or char_length(cta_label) <= 30
  );

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
      50,
      false,
      1,
      false,
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
'Canonical Mars Pixel Content Tier V1 rules. Tier capabilities are derived from server-authoritative pixel count.';

create or replace function public.get_mars_pixel_allocation_content_tier_v1(
  p_allocation_id uuid
)
returns table (
  allocation_id uuid,
  pixel_count integer,
  tier_key text,
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
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_allocation public.mars_pixel_allocations%rowtype;
  v_pixel_count integer;
begin
  if p_allocation_id is null then
    raise exception 'MARS_PIXEL_ALLOCATION_ID_REQUIRED'
      using errcode = '22004';
  end if;

  select *
  into v_allocation
  from public.mars_pixel_allocations
  where id = p_allocation_id
    and allocation_status = 'owned';

  if not found then
    raise exception 'MARS_PIXEL_ALLOCATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  v_pixel_count :=
    v_allocation.width * v_allocation.height;

  return query
  select
    v_allocation.id,
    v_pixel_count,
    tier.tier_key,
    tier.territory_name_max_chars,
    tier.description_max_chars,
    tier.image_allowed,
    tier.max_links,
    tier.cta_allowed,
    tier.socials_allowed,
    tier.analytics_allowed,
    tier.premium
  from public.get_mars_pixel_content_tier_v1(
    v_pixel_count
  ) as tier;
end;
$$;

revoke all
on function public.get_mars_pixel_allocation_content_tier_v1(uuid)
from public;

grant execute
on function public.get_mars_pixel_allocation_content_tier_v1(uuid)
to authenticated, service_role;

comment on function public.get_mars_pixel_allocation_content_tier_v1(uuid) is
'Returns Mars Pixel content capabilities from the owned allocation real width x height. Client cannot choose its own tier.';

commit;

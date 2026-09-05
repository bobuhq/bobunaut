begin;

create or replace function public.save_mars_pixel_creative_v1(
  p_allocation_id uuid,
  p_title text,
  p_description text default null,
  p_image_url text default null,
  p_destination_url text default null,
  p_cta_label text default null,
  p_links jsonb default '[]'::jsonb
)
returns table (
  creative_id uuid,
  allocation_id uuid,
  pixel_count integer,
  tier_key text,
  creative_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_allocation public.mars_pixel_allocations%rowtype;
  v_advertiser public.mars_advertisers%rowtype;
  v_pixel_count integer;
  v_tier record;

  v_title text;
  v_description text;
  v_image_url text;
  v_destination_url text;
  v_cta_label text;
  v_links jsonb;

  v_link jsonb;
  v_link_url text;
  v_link_type text;
  v_link_count integer;

  v_creative_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'MARS_PIXEL_AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;

  if p_allocation_id is null then
    raise exception 'MARS_PIXEL_ALLOCATION_ID_REQUIRED'
      using errcode = '22004';
  end if;

  select *
  into v_allocation
  from public.mars_pixel_allocations
  where id = p_allocation_id
    and allocation_status = 'owned'
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ALLOCATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select *
  into v_advertiser
  from public.mars_advertisers
  where id = v_allocation.advertiser_id;

  if not found then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_advertiser.owner_builder_id is distinct from v_user_id then
    raise exception 'MARS_PIXEL_ALLOCATION_OWNERSHIP_REQUIRED'
      using errcode = '42501';
  end if;

  if v_advertiser.status <> 'active' then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_ACTIVE'
      using errcode = '55000';
  end if;

  v_pixel_count :=
    v_allocation.width * v_allocation.height;

  select *
  into v_tier
  from public.get_mars_pixel_content_tier_v1(
    v_pixel_count
  );

  v_title := nullif(trim(coalesce(p_title, '')), '');

  if v_title is null then
    raise exception 'MARS_PIXEL_TERRITORY_NAME_REQUIRED'
      using errcode = '22023';
  end if;

  if char_length(v_title) > v_tier.territory_name_max_chars then
    raise exception 'MARS_PIXEL_TERRITORY_NAME_TOO_LONG'
      using errcode = '22023';
  end if;

  v_description :=
    nullif(trim(coalesce(p_description, '')), '');

  if v_description is not null
     and char_length(v_description) >
       v_tier.description_max_chars then
    raise exception 'MARS_PIXEL_DESCRIPTION_TOO_LONG'
      using errcode = '22023';
  end if;

  v_image_url :=
    nullif(trim(coalesce(p_image_url, '')), '');

  if v_image_url is not null then
    if not v_tier.image_allowed then
      raise exception 'MARS_PIXEL_IMAGE_NOT_ALLOWED_FOR_TIER'
        using errcode = '22023';
    end if;

    if char_length(v_image_url) > 2048
       or v_image_url !~* '^https://[^[:space:]]+$' then
      raise exception 'MARS_PIXEL_INVALID_IMAGE_URL'
        using errcode = '22023';
    end if;
  end if;

  v_destination_url :=
    nullif(trim(coalesce(p_destination_url, '')), '');

  if v_destination_url is not null
     and (
       char_length(v_destination_url) > 2048
       or v_destination_url !~* '^https://[^[:space:]]+$'
     ) then
    raise exception 'MARS_PIXEL_INVALID_DESTINATION_URL'
      using errcode = '22023';
  end if;

  v_cta_label :=
    nullif(trim(coalesce(p_cta_label, '')), '');

  if v_cta_label is not null then
    if not v_tier.cta_allowed then
      raise exception 'MARS_PIXEL_CTA_NOT_ALLOWED_FOR_TIER'
        using errcode = '22023';
    end if;

    if char_length(v_cta_label) > 30 then
      raise exception 'MARS_PIXEL_CTA_TOO_LONG'
        using errcode = '22023';
    end if;

    if v_destination_url is null then
      raise exception 'MARS_PIXEL_CTA_DESTINATION_REQUIRED'
        using errcode = '22023';
    end if;
  end if;

  v_links := coalesce(p_links, '[]'::jsonb);

  if jsonb_typeof(v_links) <> 'array' then
    raise exception 'MARS_PIXEL_LINKS_MUST_BE_ARRAY'
      using errcode = '22023';
  end if;

  v_link_count := jsonb_array_length(v_links);

  if v_link_count > v_tier.max_links then
    raise exception 'MARS_PIXEL_TOO_MANY_LINKS'
      using errcode = '22023';
  end if;

  for v_link in
    select value
    from jsonb_array_elements(v_links)
  loop
    if jsonb_typeof(v_link) <> 'object' then
      raise exception 'MARS_PIXEL_INVALID_LINK'
        using errcode = '22023';
    end if;

    if exists (
      select 1
      from jsonb_object_keys(v_link) as key_name
      where key_name not in ('type', 'url')
    ) then
      raise exception 'MARS_PIXEL_INVALID_LINK_FIELDS'
        using errcode = '22023';
    end if;

    v_link_type :=
      lower(
        trim(
          coalesce(v_link ->> 'type', '')
        )
      );

    v_link_url :=
      nullif(
        trim(
          coalesce(v_link ->> 'url', '')
        ),
        ''
      );

    if v_link_type not in (
      'website',
      'x',
      'telegram',
      'instagram',
      'youtube',
      'linkedin'
    ) then
      raise exception 'MARS_PIXEL_INVALID_LINK_TYPE'
        using errcode = '22023';
    end if;

    if v_link_type <> 'website'
       and not v_tier.socials_allowed then
      raise exception 'MARS_PIXEL_SOCIAL_LINK_NOT_ALLOWED_FOR_TIER'
        using errcode = '22023';
    end if;

    if v_link_url is null
       or char_length(v_link_url) > 2048
       or v_link_url !~* '^https://[^[:space:]]+$' then
      raise exception 'MARS_PIXEL_INVALID_LINK_URL'
        using errcode = '22023';
    end if;
  end loop;

  update public.mars_ad_creatives
  set
    status = 'archived',
    updated_at = now()
  where allocation_id = p_allocation_id
    and status in (
      'under_review',
      'active'
    );

  insert into public.mars_ad_creatives (
    allocation_id,
    title,
    description,
    image_url,
    destination_url,
    cta_label,
    links,
    status
  )
  values (
    p_allocation_id,
    v_title,
    v_description,
    v_image_url,
    v_destination_url,
    v_cta_label,
    v_links,
    'under_review'
  )
  returning id
  into v_creative_id;

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    p_allocation_id,
    'creative_changed',
    v_user_id,
    jsonb_build_object(
      'creative_id', v_creative_id,
      'pixel_count', v_pixel_count,
      'tier_key', v_tier.tier_key,
      'status', 'under_review'
    )
  );

  return query
  select
    v_creative_id,
    p_allocation_id,
    v_pixel_count,
    v_tier.tier_key::text,
    'under_review'::text;
end;
$$;

revoke all
on function public.save_mars_pixel_creative_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
from public, anon;

grant execute
on function public.save_mars_pixel_creative_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
to authenticated;

comment on function public.save_mars_pixel_creative_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) is
'Authenticated server-authoritative Mars Pixel creative submission. Verifies allocation ownership through advertiser owner_builder_id, derives Content Tier from real allocation width x height, validates territory name, description, image, CTA and links, archives the previous submitted creative, creates a new under-review creative and writes an audit event.';

commit;

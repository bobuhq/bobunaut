begin;

-- ============================================================
-- BOBU MARS PIXEL — ADMIN MANAGEMENT V48
-- Completes V47 admin read model and adds protected creative edit.
-- No allocation ownership, payment or blockchain history is changed.
-- ============================================================

drop function if exists
  public.get_admin_mars_pixel_allocations_v1(integer, integer);

create function public.get_admin_mars_pixel_allocations_v1(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  allocation_id uuid,
  allocation_status text,
  advertiser_id uuid,
  advertiser_name text,
  advertiser_status text,
  owner_builder_id uuid,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  pixel_count integer,
  color_key text,
  activated_at timestamptz,
  released_at timestamptz,
  creative_id uuid,
  creative_title text,
  creative_description text,
  creative_image_url text,
  creative_destination_url text,
  creative_cta_label text,
  creative_links jsonb,
  creative_status text,
  payment_order_id uuid,
  payment_status text,
  payment_network text,
  buyer_wallet text,
  transaction_signature text,
  amount_lamports bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    allocation.id,
    allocation.allocation_status,
    advertiser.id,
    advertiser.display_name,
    advertiser.status,
    advertiser.owner_builder_id,
    allocation.x_start,
    allocation.y_start,
    allocation.width,
    allocation.height,
    allocation.width * allocation.height,
    allocation.color_key,
    allocation.activated_at,
    allocation.released_at,
    creative.id,
    creative.title,
    creative.description,
    creative.image_url,
    creative.destination_url,
    creative.cta_label,
    creative.links,
    creative.status,
    asset.payment_order_id,
    payment.payment_status,
    payment.network,
    payment.buyer_wallet,
    payment.transaction_signature,
    payment.amount_lamports,
    allocation.created_at
  from public.mars_pixel_allocations as allocation

  left join public.mars_advertisers as advertiser
    on advertiser.id = allocation.advertiser_id

  left join lateral (
    select c.*
    from public.mars_ad_creatives as c
    where c.allocation_id = allocation.id
    order by
      case c.status
        when 'active' then 0
        when 'under_review' then 1
        when 'suspended' then 2
        else 3
      end,
      c.updated_at desc
    limit 1
  ) as creative on true

  left join lateral (
    select a.*
    from public.mars_pixel_blockchain_assets as a
    where a.allocation_id = allocation.id
    order by a.created_at desc
    limit 1
  ) as asset on true

  left join public.mars_pixel_solana_payment_orders as payment
    on payment.id = asset.payment_order_id

  order by allocation.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all
on function public.get_admin_mars_pixel_allocations_v1(integer, integer)
from public;

grant execute
on function public.get_admin_mars_pixel_allocations_v1(integer, integer)
to authenticated;


-- ============================================================
-- OWNER / ADMIN CREATIVE EDIT
-- Preserves current moderation state.
-- Uses the same content-tier validation rules as user submission.
-- ============================================================

create or replace function public.admin_edit_mars_pixel_creative_v1(
  p_creative_id uuid,
  p_title text,
  p_description text default null,
  p_image_url text default null,
  p_destination_url text default null,
  p_cta_label text default null,
  p_links jsonb default '[]'::jsonb,
  p_reason text default null
)
returns table (
  creative_id uuid,
  allocation_id uuid,
  creative_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creative public.mars_ad_creatives%rowtype;
  v_allocation public.mars_pixel_allocations%rowtype;
  v_pixel_count integer;
  v_tier record;

  v_title text;
  v_description text;
  v_image_url text;
  v_destination_url text;
  v_cta_label text;
  v_links jsonb;
  v_reason text;

  v_link jsonb;
  v_link_url text;
  v_link_type text;
  v_link_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;

  if p_creative_id is null then
    raise exception 'CREATIVE_ID_REQUIRED'
      using errcode = '22004';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');

  if v_reason is null
     or char_length(v_reason) < 3
     or char_length(v_reason) > 500 then
    raise exception 'ADMIN_REASON_REQUIRED'
      using errcode = '22023';
  end if;

  select *
  into v_creative
  from public.mars_ad_creatives
  where id = p_creative_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_CREATIVE_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select *
  into v_allocation
  from public.mars_pixel_allocations
  where id = v_creative.allocation_id
    and allocation_status = 'owned'
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
      using errcode = '55000';
  end if;

  v_pixel_count := v_allocation.width * v_allocation.height;

  select *
  into v_tier
  from public.get_mars_pixel_content_tier_v1(v_pixel_count);

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
      lower(trim(coalesce(v_link ->> 'type', '')));

    v_link_url :=
      nullif(trim(coalesce(v_link ->> 'url', '')), '');

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
    title = v_title,
    description = v_description,
    image_url = v_image_url,
    destination_url = v_destination_url,
    cta_label = v_cta_label,
    links = v_links,
    updated_at = now()
  where id = p_creative_id;

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_creative.allocation_id,
    'creative_changed',
    auth.uid(),
    jsonb_build_object(
      'action', 'admin_edit',
      'creative_id', p_creative_id,
      'reason', v_reason,
      'status', v_creative.status,
      'pixel_count', v_pixel_count,
      'tier_key', v_tier.tier_key
    )
  );

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    severity,
    metadata
  )
  values (
    auth.uid(),
    'mars_pixel_creative_edit',
    'mars_pixel_creative',
    p_creative_id::text,
    'warning',
    jsonb_build_object(
      'allocationId', v_creative.allocation_id,
      'reason', v_reason,
      'creativeStatus', v_creative.status,
      'pixelCount', v_pixel_count,
      'tierKey', v_tier.tier_key
    )
  );

  return query
  select
    p_creative_id,
    v_creative.allocation_id,
    v_creative.status;
end;
$$;

revoke all
on function public.admin_edit_mars_pixel_creative_v1(
  uuid, text, text, text, text, text, jsonb, text
)
from public;

grant execute
on function public.admin_edit_mars_pixel_creative_v1(
  uuid, text, text, text, text, text, jsonb, text
)
to authenticated;

comment on function public.get_admin_mars_pixel_allocations_v1(integer, integer) is
'Owner/admin allocation-centric Mars Pixel read model. Includes territories without creatives plus creative and preserved Solana payment context.';

comment on function public.admin_edit_mars_pixel_creative_v1(
  uuid, text, text, text, text, text, jsonb, text
) is
'Owner/admin protected Mars Pixel creative edit using canonical content-tier validation. Preserves creative moderation state and writes immutable audit history.';

commit;

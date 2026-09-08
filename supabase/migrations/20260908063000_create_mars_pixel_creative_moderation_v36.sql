begin;

-- ============================================================
-- BOBU MARS PIXEL — CREATIVE MODERATION V36
-- Admin-only moderation queue + approve/reject action.
-- Public exposure remains dependent on ACTIVE advertiser
-- and ACTIVE creative.
-- ============================================================

create or replace function public.get_admin_mars_pixel_creatives_v1(
  p_status text default 'under_review',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  creative_id uuid,
  allocation_id uuid,
  advertiser_id uuid,
  advertiser_name text,
  advertiser_status text,
  owner_builder_id uuid,
  title text,
  description text,
  image_url text,
  destination_url text,
  cta_label text,
  links jsonb,
  creative_status text,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  pixel_count integer,
  created_at timestamptz,
  updated_at timestamptz
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

  if p_status is not null
     and p_status not in (
       'under_review',
       'active',
       'suspended',
       'archived'
     ) then
    raise exception 'INVALID_CREATIVE_STATUS'
      using errcode = '22023';
  end if;

  return query
  select
    creative.id,
    allocation.id,
    advertiser.id,
    advertiser.display_name,
    advertiser.status,
    advertiser.owner_builder_id,
    creative.title,
    creative.description,
    creative.image_url,
    creative.destination_url,
    creative.cta_label,
    creative.links,
    creative.status,
    allocation.x_start,
    allocation.y_start,
    allocation.width,
    allocation.height,
    allocation.width * allocation.height,
    creative.created_at,
    creative.updated_at
  from public.mars_ad_creatives as creative
  join public.mars_pixel_allocations as allocation
    on allocation.id = creative.allocation_id
  join public.mars_advertisers as advertiser
    on advertiser.id = allocation.advertiser_id
  where
    (p_status is null or creative.status = p_status)
  order by
    case
      when creative.status = 'under_review' then 0
      else 1
    end,
    creative.created_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all
on function public.get_admin_mars_pixel_creatives_v1(
  text,
  integer,
  integer
)
from public;

grant execute
on function public.get_admin_mars_pixel_creatives_v1(
  text,
  integer,
  integer
)
to authenticated;

comment on function public.get_admin_mars_pixel_creatives_v1(
  text,
  integer,
  integer
) is
'Admin-only Mars Pixel creative moderation queue.';


create or replace function public.moderate_mars_pixel_creative_v1(
  p_creative_id uuid,
  p_decision text
)
returns table (
  creative_id uuid,
  allocation_id uuid,
  creative_status text,
  advertiser_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creative public.mars_ad_creatives%rowtype;
  v_allocation public.mars_pixel_allocations%rowtype;
  v_advertiser public.mars_advertisers%rowtype;
  v_new_status text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;

  if p_creative_id is null then
    raise exception 'CREATIVE_ID_REQUIRED'
      using errcode = '22023';
  end if;

  if lower(trim(coalesce(p_decision, ''))) = 'approve' then
    v_new_status := 'active';
  elsif lower(trim(coalesce(p_decision, ''))) = 'reject' then
    v_new_status := 'suspended';
  else
    raise exception 'INVALID_MODERATION_DECISION'
      using errcode = '22023';
  end if;

  select creative.*
  into v_creative
  from public.mars_ad_creatives as creative
  where creative.id = p_creative_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_CREATIVE_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_creative.status <> 'under_review' then
    raise exception 'MARS_PIXEL_CREATIVE_NOT_UNDER_REVIEW'
      using errcode = '55000';
  end if;

  select allocation.*
  into v_allocation
  from public.mars_pixel_allocations as allocation
  where allocation.id = v_creative.allocation_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ALLOCATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select advertiser.*
  into v_advertiser
  from public.mars_advertisers as advertiser
  where advertiser.id = v_allocation.advertiser_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_new_status = 'active' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    -- First approved creative activates an advertiser that is
    -- still waiting for its initial moderation.
    if v_advertiser.status = 'under_review' then
      update public.mars_advertisers as advertiser
      set
        status = 'active',
        updated_at = now()
      where advertiser.id = v_advertiser.id;

      v_advertiser.status := 'active';
    elsif v_advertiser.status <> 'active' then
      raise exception 'MARS_PIXEL_ADVERTISER_NOT_ELIGIBLE'
        using errcode = '55000';
    end if;

    -- One public ACTIVE creative per allocation.
    update public.mars_ad_creatives as creative
    set
      status = 'archived',
      updated_at = now()
    where creative.allocation_id = v_creative.allocation_id
      and creative.id <> v_creative.id
      and creative.status = 'active';
  end if;

  update public.mars_ad_creatives as creative
  set
    status = v_new_status,
    updated_at = now()
  where creative.id = v_creative.id;

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
      'creative_id', v_creative.id,
      'moderation_decision', lower(trim(p_decision)),
      'previous_status', v_creative.status,
      'status', v_new_status,
      'advertiser_id', v_advertiser.id,
      'advertiser_status', v_advertiser.status
    )
  );

  return query
  select
    v_creative.id,
    v_creative.allocation_id,
    v_new_status,
    v_advertiser.status;
end;
$$;

revoke all
on function public.moderate_mars_pixel_creative_v1(
  uuid,
  text
)
from public;

grant execute
on function public.moderate_mars_pixel_creative_v1(
  uuid,
  text
)
to authenticated;

comment on function public.moderate_mars_pixel_creative_v1(
  uuid,
  text
) is
'Admin-only Mars Pixel creative moderation. Approve activates the creative and initial under-review advertiser; reject suspends only the submitted creative.';

commit;

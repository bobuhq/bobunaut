-- Fix ambiguous PL/pgSQL column references in Mars Pixel admin lifecycle RPC.
-- No data mutation. Replaces function definition only.

begin;

create or replace function public.admin_manage_mars_pixel_allocation_v1(
  p_allocation_id uuid,
  p_action text,
  p_reason text
)
returns table (
  allocation_id uuid,
  allocation_status text,
  creative_status text,
  action text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allocation public.mars_pixel_allocations%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_creative_status text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_ACCESS_REQUIRED'
      using errcode = '42501';
  end if;

  if p_allocation_id is null then
    raise exception 'ALLOCATION_ID_REQUIRED'
      using errcode = '22023';
  end if;

  if v_action not in (
    'hide',
    'restore',
    'remove_creative',
    'release'
  ) then
    raise exception 'INVALID_ADMIN_ACTION'
      using errcode = '22023';
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'ADMIN_REASON_REQUIRED'
      using errcode = '22023';
  end if;

  select allocation.*
  into v_allocation
  from public.mars_pixel_allocations as allocation
  where allocation.id = p_allocation_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ALLOCATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_action = 'hide' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    update public.mars_ad_creatives as creative
    set status = 'suspended'
    where creative.allocation_id = p_allocation_id
      and creative.status = 'active';

  elsif v_action = 'restore' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    update public.mars_ad_creatives as creative
    set status = 'archived'
    where creative.allocation_id = p_allocation_id
      and creative.status = 'active';

    update public.mars_ad_creatives as target_creative
    set status = 'active'
    where target_creative.id = (
      select creative.id
      from public.mars_ad_creatives as creative
      where creative.allocation_id = p_allocation_id
        and creative.status = 'suspended'
      order by creative.updated_at desc
      limit 1
    );

  elsif v_action = 'remove_creative' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    update public.mars_ad_creatives as creative
    set
      status = 'archived',
      image_url = null,
      destination_url = null
    where creative.allocation_id = p_allocation_id
      and creative.status in ('active', 'under_review', 'suspended');

  elsif v_action = 'release' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    update public.mars_ad_creatives as creative
    set status = 'archived'
    where creative.allocation_id = p_allocation_id
      and creative.status <> 'archived';

    update public.mars_pixel_allocations as allocation
    set
      allocation_status = 'released',
      released_at = now()
    where allocation.id = p_allocation_id;

  end if;

  select creative.status
  into v_creative_status
  from public.mars_ad_creatives as creative
  where creative.allocation_id = p_allocation_id
  order by creative.updated_at desc
  limit 1;

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    p_allocation_id,
    'admin_' || v_action,
    auth.uid(),
    jsonb_build_object(
      'action', v_action,
      'reason', v_reason,
      'previous_allocation_status', v_allocation.allocation_status,
      'allocation_status',
        case
          when v_action = 'release' then 'released'
          else v_allocation.allocation_status
        end,
      'creative_status', v_creative_status
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
    'mars_pixel_' || v_action,
    'mars_pixel_allocation',
    p_allocation_id::text,
    case
      when v_action = 'release' then 'critical'
      when v_action = 'remove_creative' then 'warning'
      else 'info'
    end,
    jsonb_build_object(
      'reason', v_reason,
      'previousAllocationStatus', v_allocation.allocation_status,
      'allocationStatus',
        case
          when v_action = 'release' then 'released'
          else v_allocation.allocation_status
        end,
      'creativeStatus', v_creative_status
    )
  );

  return query
  select
    p_allocation_id,
    case
      when v_action = 'release' then 'released'
      else v_allocation.allocation_status
    end,
    v_creative_status,
    v_action;
end;
$$;

commit;

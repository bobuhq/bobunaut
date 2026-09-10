begin;

-- ============================================================
-- BOBU MARS PIXEL — ADMIN LIFECYCLE V47
-- Allocation-centric admin management.
-- No payment transfer/refund execution is performed here.
-- Financial and blockchain history remains immutable/preserved.
-- ============================================================

create or replace function public.get_admin_mars_pixel_allocations_v1(
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
  creative_image_url text,
  creative_destination_url text,
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
    creative.image_url,
    creative.destination_url,
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

    update public.mars_ad_creatives
    set status = 'suspended'
    where allocation_id = p_allocation_id
      and status = 'active';

  elsif v_action = 'restore' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    update public.mars_ad_creatives
    set status = 'archived'
    where allocation_id = p_allocation_id
      and status = 'active';

    update public.mars_ad_creatives
    set status = 'active'
    where id = (
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

    update public.mars_ad_creatives
    set
      status = 'archived',
      image_url = null,
      destination_url = null
    where allocation_id = p_allocation_id
      and status in ('active', 'under_review', 'suspended');

  elsif v_action = 'release' then
    if v_allocation.allocation_status <> 'owned' then
      raise exception 'MARS_PIXEL_ALLOCATION_NOT_OWNED'
        using errcode = '55000';
    end if;

    update public.mars_ad_creatives
    set status = 'archived'
    where allocation_id = p_allocation_id
      and status <> 'archived';

    update public.mars_pixel_allocations
    set
      allocation_status = 'released',
      released_at = now()
    where id = p_allocation_id;

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

revoke all
on function public.admin_manage_mars_pixel_allocation_v1(uuid, text, text)
from public;

grant execute
on function public.admin_manage_mars_pixel_allocation_v1(uuid, text, text)
to authenticated;

comment on function public.get_admin_mars_pixel_allocations_v1(integer, integer) is
'Owner/admin Mars Pixel allocation read model including advertiser, creative and preserved Solana payment context.';

comment on function public.admin_manage_mars_pixel_allocation_v1(uuid, text, text) is
'Owner/admin Mars Pixel lifecycle management: hide, restore, remove creative or release territory. Does not execute blockchain refunds or delete payment history.';

commit;

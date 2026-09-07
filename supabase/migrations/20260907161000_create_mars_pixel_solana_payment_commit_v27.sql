-- BOBU Mars Pixel
-- V27 — Solana verified payment commit foundation
--
-- This migration does NOT query Solana.
-- Blockchain verification is performed server-side in an Edge Function.
--
-- This SQL transition only accepts payment facts after the backend
-- has independently verified the Solana transaction.
--
-- Critical rule:
-- once a verified payment is committed into Mars ownership,
-- later blockchain asset minting failure must NEVER reopen the area.

create or replace function public.commit_mars_pixel_solana_payment_v1(
  p_payment_order_id uuid,
  p_transaction_signature text,
  p_advertiser_id uuid default null,
  p_requested_color_key text default null
)
returns table (
  payment_order_id uuid,
  payment_status text,
  reservation_id uuid,
  allocation_id uuid,
  transaction_signature text,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.mars_pixel_solana_payment_orders%rowtype;
  v_reservation public.mars_pixel_reservations%rowtype;
  v_allocation_id uuid;
  v_now timestamptz := now();
begin
  if p_payment_order_id is null then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_REQUIRED'
      using errcode = '22023';
  end if;

  if p_transaction_signature is null
     or char_length(trim(p_transaction_signature)) < 32
     or char_length(trim(p_transaction_signature)) > 128 then
    raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_SIGNATURE_INVALID'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_reservation_v1')::bigint
  );

  select *
  into v_order
  from public.mars_pixel_solana_payment_orders
  where id = p_payment_order_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  -- Idempotent replay after successful verification.
  if v_order.payment_status = 'verified' then
    if v_order.transaction_signature <>
       trim(p_transaction_signature) then
      raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_CONFLICT'
        using errcode = '23505';
    end if;

    select asset.allocation_id
    into v_allocation_id
    from public.mars_pixel_blockchain_assets as asset
    where asset.reservation_id = v_order.reservation_id;

    return query
    select
      v_order.id,
      v_order.payment_status,
      v_order.reservation_id,
      v_allocation_id,
      v_order.transaction_signature,
      v_order.verified_at;

    return;
  end if;

  if v_order.payment_status not in (
    'awaiting_payment',
    'detected',
    'verifying'
  ) then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_NOT_COMMITTABLE'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_solana_payment_orders as other_order
    where other_order.transaction_signature =
      trim(p_transaction_signature)
      and other_order.id <> v_order.id
  ) then
    raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_ALREADY_USED'
      using errcode = '23505';
  end if;

  select *
  into v_reservation
  from public.mars_pixel_reservations
  where id = v_order.reservation_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_reservation.builder_id <> v_order.builder_id then
    raise exception 'MARS_PIXEL_SOLANA_BUILDER_MISMATCH'
      using errcode = '55000';
  end if;

  if v_reservation.status <> 'active' then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_ACTIVE'
      using errcode = '55000';
  end if;

  if v_reservation.grid_version <> v_order.grid_version
     or v_reservation.x_start <> v_order.x_start
     or v_reservation.y_start <> v_order.y_start
     or v_reservation.width <> v_order.width
     or v_reservation.height <> v_order.height
     or v_reservation.pixel_count <> v_order.pixel_count then
    raise exception 'MARS_PIXEL_SOLANA_RESERVATION_SNAPSHOT_MISMATCH'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.allocation_status = 'owned'
      and int4range(
        allocation.x_start,
        allocation.x_start + allocation.width,
        '[)'
      ) && int4range(
        v_order.x_start,
        v_order.x_start + v_order.width,
        '[)'
      )
      and int4range(
        allocation.y_start,
        allocation.y_start + allocation.height,
        '[)'
      ) && int4range(
        v_order.y_start,
        v_order.y_start + v_order.height,
        '[)'
      )
  ) then
    raise exception 'MARS_PIXEL_AREA_ALREADY_OWNED'
      using errcode = '23P01';
  end if;

  insert into public.mars_pixel_allocations (
    advertiser_id,
    allocation_status,
    grid_version,
    x_start,
    y_start,
    width,
    height,
    color_key,
    activated_at
  )
  values (
    p_advertiser_id,
    'owned',
    v_order.grid_version,
    v_order.x_start,
    v_order.y_start,
    v_order.width,
    v_order.height,
    p_requested_color_key,
    v_now
  )
  returning id
  into v_allocation_id;

  update public.mars_pixel_reservations
  set
    status = 'converted',
    updated_at = v_now
  where id = v_order.reservation_id;

  update public.mars_pixel_solana_payment_orders
  set
    transaction_signature = trim(p_transaction_signature),
    payment_status = 'verified',
    detected_at = coalesce(detected_at, v_now),
    verified_at = v_now,
    updated_at = v_now
  where id = v_order.id;

  insert into public.mars_pixel_blockchain_assets (
    reservation_id,
    allocation_id,
    builder_id,
    asset_key,
    grid_version,
    x_start,
    y_start,
    width,
    height,
    pixel_count,
    owner_wallet,
    network,
    asset_status
  )
  values (
    v_order.reservation_id,
    v_allocation_id,
    v_order.builder_id,
    'mars:' ||
      v_order.grid_version::text || ':' ||
      v_order.x_start::text || ':' ||
      v_order.y_start::text || ':' ||
      v_order.width::text || ':' ||
      v_order.height::text,
    v_order.grid_version,
    v_order.x_start,
    v_order.y_start,
    v_order.width,
    v_order.height,
    v_order.pixel_count,
    v_order.buyer_wallet,
    v_order.network,
    'pending'
  );

  return query
  select
    v_order.id,
    'verified'::text,
    v_order.reservation_id,
    v_allocation_id,
    trim(p_transaction_signature),
    v_now;
end;
$$;

revoke all
on function public.commit_mars_pixel_solana_payment_v1(
  uuid,
  text,
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function public.commit_mars_pixel_solana_payment_v1(
  uuid,
  text,
  uuid,
  text
)
to service_role;

comment on function public.commit_mars_pixel_solana_payment_v1(
  uuid,
  text,
  uuid,
  text
) is
'Commits a Mars Pixel allocation only after a trusted backend has independently verified the exact Solana payment. This function never performs blockchain verification itself.';

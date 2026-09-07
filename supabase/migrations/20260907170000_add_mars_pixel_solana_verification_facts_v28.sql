-- BOBU Mars Pixel
-- V28 — Solana verified transaction facts
--
-- Stores immutable facts observed by the trusted backend verifier.
-- SQL itself does NOT query Solana.
--
-- These fields let BOBU distinguish:
--   "transaction landed before checkout expiry"
-- from
--   "backend happened to verify it after checkout expiry".

alter table public.mars_pixel_solana_payment_orders
  add column if not exists transaction_slot bigint,
  add column if not exists transaction_block_time timestamptz;

alter table public.mars_pixel_solana_payment_orders
  drop constraint if exists mars_pixel_solana_payment_orders_transaction_slot_check;

alter table public.mars_pixel_solana_payment_orders
  add constraint mars_pixel_solana_payment_orders_transaction_slot_check
  check (
    transaction_slot is null
    or transaction_slot > 0
  );

comment on column
  public.mars_pixel_solana_payment_orders.transaction_slot
is
'Solana slot independently verified by the trusted backend for the accepted transaction.';

comment on column
  public.mars_pixel_solana_payment_orders.transaction_block_time
is
'Solana transaction block time independently verified by the trusted backend. Used to determine whether payment landed before checkout expiry.';


alter table public.mars_pixel_blockchain_assets
  add column if not exists payment_order_id uuid;

alter table public.mars_pixel_blockchain_assets
  drop constraint if exists mars_pixel_blockchain_assets_payment_order_id_fkey;

alter table public.mars_pixel_blockchain_assets
  add constraint mars_pixel_blockchain_assets_payment_order_id_fkey
  foreign key (payment_order_id)
  references public.mars_pixel_solana_payment_orders(id)
  on delete restrict;

create unique index if not exists
  mars_pixel_blockchain_assets_payment_order_uidx
on public.mars_pixel_blockchain_assets(payment_order_id)
where payment_order_id is not null;

comment on column
  public.mars_pixel_blockchain_assets.payment_order_id
is
'The verified Solana payment order that created this Mars blockchain asset.';


create or replace function public.commit_mars_pixel_solana_payment_v2(
  p_payment_order_id uuid,
  p_transaction_signature text,
  p_transaction_slot bigint,
  p_transaction_block_time timestamptz,
  p_advertiser_id uuid,
  p_requested_color_key text default null
)
returns table (
  payment_order_id uuid,
  payment_status text,
  reservation_id uuid,
  allocation_id uuid,
  transaction_signature text,
  transaction_slot bigint,
  transaction_block_time timestamptz,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.mars_pixel_solana_payment_orders%rowtype;
  v_reservation public.mars_pixel_reservations%rowtype;
  v_advertiser public.mars_advertisers%rowtype;
  v_allocation_id uuid;
  v_asset_allocation_id uuid;
  v_final_color_key text;
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

  if p_transaction_slot is null
     or p_transaction_slot <= 0 then
    raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_SLOT_INVALID'
      using errcode = '22023';
  end if;

  if p_transaction_block_time is null then
    raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_BLOCK_TIME_REQUIRED'
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

  -- Successful replay must match ALL immutable chain facts.
  -- refund_required is also terminal and idempotent because the
  -- blockchain payment itself has already been independently verified.
  if v_order.payment_status in ('verified', 'refund_required') then
    if v_order.transaction_signature <> trim(p_transaction_signature)
       or v_order.transaction_slot <> p_transaction_slot
       or v_order.transaction_block_time <> p_transaction_block_time then
      raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_CONFLICT'
        using errcode = '23505';
    end if;

    select asset.allocation_id
    into v_asset_allocation_id
    from public.mars_pixel_blockchain_assets as asset
    where asset.payment_order_id = v_order.id;

    return query
    select
      v_order.id,
      v_order.payment_status,
      v_order.reservation_id,
      v_asset_allocation_id,
      v_order.transaction_signature,
      v_order.transaction_slot,
      v_order.transaction_block_time,
      v_order.verified_at;

    return;
  end if;

  if v_order.payment_status not in (
    'awaiting_payment',
    'detected',
    'verifying',
    'expired'
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


  -- The payment is real, but it landed after this checkout expired.
  -- Persist the verified blockchain facts and route the payment
  -- to refund handling. Never create Mars ownership for it.
  if p_transaction_block_time > v_order.expires_at then
    update public.mars_pixel_solana_payment_orders
    set
      transaction_signature = trim(p_transaction_signature),
      transaction_slot = p_transaction_slot,
      transaction_block_time = p_transaction_block_time,
      payment_status = 'refund_required',
      detected_at = coalesce(detected_at, v_now),
      verified_at = v_now,
      updated_at = v_now
    where id = v_order.id;

    return query
    select
      v_order.id,
      'refund_required'::text,
      v_order.reservation_id,
      null::uuid,
      trim(p_transaction_signature),
      p_transaction_slot,
      p_transaction_block_time,
      v_now;

    return;
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

  -- Active is normal. Expired is allowed only because the verified
  -- transaction itself landed before order expiry.
  if v_reservation.status not in ('active', 'expired') then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_COMMITTABLE'
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


  -- If expiry released the reservation and somebody legitimately
  -- acquired the same area meanwhile, we must NOT overwrite them.
  -- Backend can then handle the original payment as refund_required.
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
    update public.mars_pixel_solana_payment_orders
    set
      transaction_signature = trim(p_transaction_signature),
      transaction_slot = p_transaction_slot,
      transaction_block_time = p_transaction_block_time,
      payment_status = 'refund_required',
      detected_at = coalesce(detected_at, v_now),
      verified_at = v_now,
      updated_at = v_now
    where id = v_order.id;

    return query
    select
      v_order.id,
      'refund_required'::text,
      v_order.reservation_id,
      null::uuid,
      trim(p_transaction_signature),
      p_transaction_slot,
      p_transaction_block_time,
      v_now;

    return;
  end if;

  if p_advertiser_id is null then
    raise exception 'MARS_PIXEL_ADVERTISER_REQUIRED'
      using errcode = '22023';
  end if;

  select *
  into v_advertiser
  from public.mars_advertisers as advertiser
  where advertiser.id = p_advertiser_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_advertiser.owner_builder_id is null
     or v_advertiser.owner_builder_id <> v_order.builder_id then
    raise exception 'MARS_PIXEL_ADVERTISER_OWNER_MISMATCH'
      using errcode = '42501';
  end if;

  if v_advertiser.status not in ('under_review', 'active') then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_ELIGIBLE'
      using errcode = '55000';
  end if;

  if p_requested_color_key is null then
    select option_row.color_key
    into v_final_color_key
    from public.get_mars_pixel_territory_color_options_v1(
      v_order.x_start,
      v_order.y_start,
      v_order.width,
      v_order.height
    ) as option_row
    where option_row.allowed = true
    order by option_row.auto_rank
    limit 1;
  else
    select option_row.color_key
    into v_final_color_key
    from public.get_mars_pixel_territory_color_options_v1(
      v_order.x_start,
      v_order.y_start,
      v_order.width,
      v_order.height
    ) as option_row
    where option_row.color_key =
      upper(trim(p_requested_color_key))
      and option_row.allowed = true
    limit 1;

    if v_final_color_key is null then
      raise exception 'MARS_PIXEL_ADJACENT_COLOR_CONFLICT'
        using errcode = '55000';
    end if;
  end if;

  if v_final_color_key is null then
    raise exception 'MARS_PIXEL_NO_AVAILABLE_TERRITORY_COLOR'
      using errcode = '55000';
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
    v_final_color_key,
    v_now
  )
  returning id
  into v_allocation_id;

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_allocation_id,
    'created',
    v_order.builder_id,
    jsonb_build_object(
      'payment_method', 'solana',
      'payment_order_id', v_order.id,
      'reservation_id', v_order.reservation_id,
      'network', v_order.network,
      'amount_lamports', v_order.amount_lamports,
      'transaction_signature', trim(p_transaction_signature),
      'transaction_slot', p_transaction_slot,
      'transaction_block_time', p_transaction_block_time,
      'color_key', v_final_color_key
    )
  );

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_allocation_id,
    'activated',
    v_order.builder_id,
    jsonb_build_object(
      'payment_method', 'solana',
      'payment_order_id', v_order.id,
      'reservation_id', v_order.reservation_id,
      'network', v_order.network,
      'color_key', v_final_color_key
    )
  );

  update public.mars_pixel_reservations
  set
    status = 'converted',
    updated_at = v_now
  where id = v_order.reservation_id;

  update public.mars_pixel_solana_payment_orders
  set
    transaction_signature = trim(p_transaction_signature),
    transaction_slot = p_transaction_slot,
    transaction_block_time = p_transaction_block_time,
    payment_status = 'verified',
    detected_at = coalesce(detected_at, v_now),
    verified_at = v_now,
    updated_at = v_now
  where id = v_order.id;

  insert into public.mars_pixel_blockchain_assets (
    payment_order_id,
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
    v_order.id,
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
    p_transaction_slot,
    p_transaction_block_time,
    v_now;
end;
$$;

revoke all
on function public.commit_mars_pixel_solana_payment_v2(
  uuid,
  text,
  bigint,
  timestamptz,
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function public.commit_mars_pixel_solana_payment_v2(
  uuid,
  text,
  bigint,
  timestamptz,
  uuid,
  text
)
to service_role;

comment on function public.commit_mars_pixel_solana_payment_v2(
  uuid,
  text,
  bigint,
  timestamptz,
  uuid,
  text
) is
'Commits Mars Pixel ownership from independently verified Solana transaction facts. Allows delayed backend verification only when the transaction itself landed before checkout expiry.';

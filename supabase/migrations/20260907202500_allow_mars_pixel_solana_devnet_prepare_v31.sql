-- ============================================================
-- BOBU MARS PIXEL — SOLANA DEVNET PREPARE V31
--
-- Allow trusted Solana Devnet checkout preparation while the
-- general Mars Pixel commercial network remains locked.
--
-- This does NOT activate Mainnet or the general commercial path.
-- ============================================================

begin;

create or replace function public.prepare_mars_pixel_solana_payment_v1(
  p_builder_id uuid,
  p_reservation_id uuid,
  p_buyer_wallet text,
  p_idempotency_key text
)
returns table (
  payment_order_id uuid,
  payment_status text,
  reservation_id uuid,
  grid_version integer,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  pixel_count integer,
  pricing_version integer,
  lamports_per_pixel bigint,
  amount_lamports bigint,
  network text,
  treasury_address text,
  buyer_wallet text,
  payment_reference text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_network_config public.mars_pixel_network_config%rowtype;
  v_solana_config public.mars_pixel_solana_config%rowtype;
  v_reservation public.mars_pixel_reservations%rowtype;
  v_existing public.mars_pixel_solana_payment_orders%rowtype;

  v_pricing_version integer;
  v_lamports_per_pixel bigint;
  v_amount_lamports bigint;

  v_order_id uuid;
  v_payment_reference text;
  v_expires_at timestamptz;

  v_gp_intent_count bigint;
begin
  if p_builder_id is null then
    raise exception 'BUILDER_ID_REQUIRED'
      using errcode = '22004';
  end if;

  if p_reservation_id is null then
    raise exception 'RESERVATION_ID_REQUIRED'
      using errcode = '22004';
  end if;

  if p_buyer_wallet is null
     or char_length(trim(p_buyer_wallet))
        not between 32 and 44 then
    raise exception 'INVALID_SOLANA_BUYER_WALLET'
      using errcode = '22023';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) = 0
     or char_length(trim(p_idempotency_key)) > 255 then
    raise exception 'INVALID_IDEMPOTENCY_KEY'
      using errcode = '22023';
  end if;

  select *
  into v_network_config
  from public.mars_pixel_network_config
  where id = 1
  for update;

  if not found then
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  select *
  into v_solana_config
  from public.mars_pixel_solana_config
  where id = 1
  for update;

  if not found then
    raise exception 'MARS_PIXEL_SOLANA_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  /*
   * Devnet testing is intentionally allowed while the general
   * Mars Pixel commercial network remains locked.
   *
   * Mainnet/production SOL checkout still requires the general
   * commercial network to be active.
   */
  if not (
    v_solana_config.network = 'devnet'
    and v_solana_config.payment_status = 'devnet_testing'
  ) then
    if v_network_config.commercial_status <> 'active' then
      raise exception 'MARS_PIXEL_COMMERCIAL_LOCKED'
        using errcode = '55000';
    end if;

    if v_solana_config.payment_status <> 'active' then
      raise exception 'MARS_PIXEL_SOLANA_PAYMENTS_DISABLED'
        using errcode = '55000';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_reservation_v1')::bigint
  );

  -- Expire only unpaid/in-progress orders.
  -- Verified payments must never be automatically reopened.
  update public.mars_pixel_solana_payment_orders as sol_order
  set
    payment_status = 'expired',
    updated_at = now()
  where sol_order.payment_status in (
      'awaiting_payment',
      'detected',
      'verifying'
    )
    and sol_order.expires_at <= now();

  -- Idempotent replay.
  select *
  into v_existing
  from public.mars_pixel_solana_payment_orders as sol_order
  where sol_order.builder_id = p_builder_id
    and sol_order.idempotency_key =
      trim(p_idempotency_key)
  for update;

  if found then
    if v_existing.reservation_id <> p_reservation_id then
      raise exception 'MARS_PIXEL_SOLANA_IDEMPOTENCY_CONFLICT'
        using errcode = '23505';
    end if;

    if v_existing.buyer_wallet <>
       trim(p_buyer_wallet) then
      raise exception 'MARS_PIXEL_SOLANA_WALLET_CONFLICT'
        using errcode = '23505';
    end if;

    return query
    select
      v_existing.id,
      v_existing.payment_status,
      v_existing.reservation_id,
      v_existing.grid_version,
      v_existing.x_start,
      v_existing.y_start,
      v_existing.width,
      v_existing.height,
      v_existing.pixel_count,
      v_existing.pricing_version,
      v_existing.lamports_per_pixel,
      v_existing.amount_lamports,
      v_existing.network,
      v_existing.treasury_address,
      v_existing.buyer_wallet,
      v_existing.payment_reference,
      v_existing.expires_at;

    return;
  end if;

  select *
  into v_reservation
  from public.mars_pixel_reservations as reservation
  where reservation.id = p_reservation_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_reservation.builder_id <> p_builder_id then
    raise exception 'MARS_PIXEL_RESERVATION_OWNER_MISMATCH'
      using errcode = '42501';
  end if;

  if v_reservation.grid_version <>
     v_network_config.grid_version then
    raise exception 'MARS_PIXEL_GRID_VERSION_MISMATCH'
      using errcode = '55000';
  end if;

  if v_reservation.status <> 'active' then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_ACTIVE'
      using errcode = '55000';
  end if;

  if v_reservation.expires_at <= now() then
    raise exception 'MARS_PIXEL_RESERVATION_EXPIRED'
      using errcode = '55000';
  end if;

  if v_reservation.pixel_count < 50 then
    raise exception 'MARS_PIXEL_BELOW_MINIMUM'
      using errcode = '55000';
  end if;

  if v_reservation.pixel_count <>
     v_reservation.width * v_reservation.height then
    raise exception 'MARS_PIXEL_GEOMETRY_MISMATCH'
      using errcode = '55000';
  end if;

  -- A reservation cannot have an active GP settlement path
  -- while SOL checkout is being prepared.
  select count(*)
  into v_gp_intent_count
  from public.mars_pixel_purchase_intents as purchase
  where purchase.reservation_id = v_reservation.id
    and purchase.status in ('prepared', 'committed');

  if v_gp_intent_count > 0 then
    raise exception 'MARS_PIXEL_GP_PURCHASE_INTENT_ALREADY_ACTIVE'
      using errcode = '55000';
  end if;

  -- Select the most specific active pricing tier.
  select
    tier.pricing_version,
    tier.lamports_per_pixel
  into
    v_pricing_version,
    v_lamports_per_pixel
  from public.mars_pixel_solana_price_tiers as tier
  where tier.active = true
    and tier.min_pixels <= v_reservation.pixel_count
    and (
      tier.max_pixels is null
      or tier.max_pixels >= v_reservation.pixel_count
    )
  order by
    tier.pricing_version desc,
    tier.min_pixels desc
  limit 1;

  if not found then
    raise exception 'MARS_PIXEL_SOLANA_PRICE_TIER_NOT_FOUND'
      using errcode = '55000';
  end if;

  if v_lamports_per_pixel >
     (
       9223372036854775807::bigint /
       v_reservation.pixel_count::bigint
     ) then
    raise exception 'MARS_PIXEL_SOLANA_PRICE_OVERFLOW'
      using errcode = '22003';
  end if;

  v_amount_lamports :=
    v_lamports_per_pixel *
    v_reservation.pixel_count::bigint;

  -- Checkout can never outlive the reservation.
  v_expires_at :=
    least(
      v_reservation.expires_at,
      now() + interval '15 minutes'
    );

  if v_expires_at <= now() then
    raise exception 'MARS_PIXEL_RESERVATION_EXPIRED'
      using errcode = '55000';
  end if;

  -- BOBU Mars payment memo reference.
  -- This UUID is embedded in a Solana Memo instruction so the
  -- backend can correlate the transaction with exactly one order.
  -- It is intentionally NOT a Solana Pay reference public key,
  -- private key, signer or wallet address.
  v_payment_reference := gen_random_uuid()::text;

  insert into public.mars_pixel_solana_payment_orders (
    builder_id,
    reservation_id,
    grid_version,
    x_start,
    y_start,
    width,
    height,
    pixel_count,
    pricing_version,
    lamports_per_pixel,
    amount_lamports,
    network,
    treasury_address,
    buyer_wallet,
    payment_reference,
    payment_status,
    expires_at,
    idempotency_key
  )
  values (
    p_builder_id,
    v_reservation.id,
    v_reservation.grid_version,
    v_reservation.x_start,
    v_reservation.y_start,
    v_reservation.width,
    v_reservation.height,
    v_reservation.pixel_count,
    v_pricing_version,
    v_lamports_per_pixel,
    v_amount_lamports,
    v_solana_config.network,
    v_solana_config.treasury_address,
    trim(p_buyer_wallet),
    v_payment_reference,
    'awaiting_payment',
    v_expires_at,
    trim(p_idempotency_key)
  )
  returning id
  into v_order_id;

  return query
  select
    v_order_id,
    'awaiting_payment'::text,
    v_reservation.id,
    v_reservation.grid_version,
    v_reservation.x_start,
    v_reservation.y_start,
    v_reservation.width,
    v_reservation.height,
    v_reservation.pixel_count,
    v_pricing_version,
    v_lamports_per_pixel,
    v_amount_lamports,
    v_solana_config.network,
    v_solana_config.treasury_address,
    trim(p_buyer_wallet),
    v_payment_reference,
    v_expires_at;
end;
$$;

revoke all
on function public.prepare_mars_pixel_solana_payment_v1(
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.prepare_mars_pixel_solana_payment_v1(
  uuid,
  uuid,
  text,
  text
)
to service_role;

comment on function public.prepare_mars_pixel_solana_payment_v1(
  uuid,
  uuid,
  text,
  text
) is
'Service-role-only Mars Pixel Solana checkout preparation. Devnet/devnet_testing is permitted while the general commercial network remains locked. Non-Devnet production checkout still requires the general commercial network and Solana payments to be active.';

commit;

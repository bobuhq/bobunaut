begin;

-- ============================================================
-- BOBU MARS PIXEL V26
-- Solana Devnet Payment Foundation
--
-- Additive only:
--   - Does NOT replace GP settlement
--   - Does NOT modify V22 reservation geometry
--   - Does NOT debit GP
--   - Does NOT mint blockchain assets yet
--   - Does NOT expose private keys
--
-- Network:
--   Solana Devnet
--
-- Treasury:
--   Public address only. Private key must never enter database,
--   frontend source, GitHub or migrations.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Solana payment configuration
-- ------------------------------------------------------------

create table public.mars_pixel_solana_config (
  id smallint primary key
    check (id = 1),

  network text not null
    check (network in ('devnet', 'mainnet-beta')),

  treasury_address text not null
    check (
      char_length(trim(treasury_address))
      between 32 and 44
    ),

  payment_status text not null default 'disabled'
    check (
      payment_status in (
        'disabled',
        'devnet_testing',
        'active',
        'paused'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.mars_pixel_solana_config (
  id,
  network,
  treasury_address,
  payment_status
)
values (
  1,
  'devnet',
  '6yZvQFbWzRwZjywYyxQL6X8t2mUfLfTvfGT7KMKVudSH',
  'devnet_testing'
);

alter table public.mars_pixel_solana_config
  enable row level security;

revoke all
on table public.mars_pixel_solana_config
from public, anon, authenticated;


-- ------------------------------------------------------------
-- 2. Versioned SOL pricing tiers
--
-- Values are stored in lamports.
-- 1 SOL = 1,000,000,000 lamports.
-- ------------------------------------------------------------

create table public.mars_pixel_solana_price_tiers (
  id uuid primary key default gen_random_uuid(),

  pricing_version integer not null
    check (pricing_version > 0),

  min_pixels integer not null
    check (min_pixels >= 50),

  max_pixels integer
    check (
      max_pixels is null
      or max_pixels >= min_pixels
    ),

  lamports_per_pixel bigint not null
    check (lamports_per_pixel > 0),

  active boolean not null default true,

  created_at timestamptz not null default now(),

  unique (pricing_version, min_pixels)
);

insert into public.mars_pixel_solana_price_tiers (
  pricing_version,
  min_pixels,
  max_pixels,
  lamports_per_pixel
)
values
  (1, 50,   99,   5000000),
  (1, 100,  199,  4500000),
  (1, 200,  499,  4000000),
  (1, 500,  999,  3500000),
  (1, 1000, null, 3000000);

alter table public.mars_pixel_solana_price_tiers
  enable row level security;

revoke all
on table public.mars_pixel_solana_price_tiers
from public, anon, authenticated;


-- ------------------------------------------------------------
-- 3. Solana payment orders
--
-- Reservation geometry remains authoritative in
-- mars_pixel_reservations.
--
-- Amount and geometry are snapshotted server-side when an order
-- is created.
-- ------------------------------------------------------------

create table public.mars_pixel_solana_payment_orders (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete restrict,

  reservation_id uuid not null
    references public.mars_pixel_reservations(id)
    on delete restrict,

  grid_version integer not null
    check (grid_version > 0),

  x_start integer not null,
  y_start integer not null,
  width integer not null
    check (width > 0),
  height integer not null
    check (height > 0),

  pixel_count integer not null
    check (pixel_count >= 50),

  pricing_version integer not null
    check (pricing_version > 0),

  lamports_per_pixel bigint not null
    check (lamports_per_pixel > 0),

  amount_lamports bigint not null
    check (amount_lamports > 0),

  network text not null
    check (network in ('devnet', 'mainnet-beta')),

  treasury_address text not null,

  buyer_wallet text,

  payment_reference text not null unique,

  transaction_signature text unique,

  payment_status text not null default 'awaiting_payment'
    check (
      payment_status in (
        'awaiting_payment',
        'detected',
        'verifying',
        'verified',
        'failed',
        'expired',
        'refund_required'
      )
    ),

  expires_at timestamptz not null,

  detected_at timestamptz,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (x_start >= 0 and x_start < 1000),
  check (y_start >= 0 and y_start < 1000),
  check (x_start + width <= 1000),
  check (y_start + height <= 1000),

  check (pixel_count = width * height),

  check (
    amount_lamports =
      lamports_per_pixel * pixel_count::bigint
  ),

  check (expires_at > created_at)
);

create unique index
  mars_pixel_solana_active_reservation_uidx
on public.mars_pixel_solana_payment_orders (reservation_id)
where payment_status in (
  'awaiting_payment',
  'detected',
  'verifying',
  'verified'
);

create index
  mars_pixel_solana_builder_orders_idx
on public.mars_pixel_solana_payment_orders (
  builder_id,
  created_at desc
);

create index
  mars_pixel_solana_payment_status_idx
on public.mars_pixel_solana_payment_orders (
  payment_status,
  created_at
);

alter table public.mars_pixel_solana_payment_orders
  enable row level security;

revoke all
on table public.mars_pixel_solana_payment_orders
from public, anon, authenticated;


-- ------------------------------------------------------------
-- 4. Blockchain asset registry foundation
--
-- Minting is intentionally NOT implemented in V26.
-- Payment verification and asset minting remain separate state
-- transitions.
-- ------------------------------------------------------------

create table public.mars_pixel_blockchain_assets (
  id uuid primary key default gen_random_uuid(),

  reservation_id uuid not null unique
    references public.mars_pixel_reservations(id)
    on delete restrict,

  allocation_id uuid unique
    references public.mars_pixel_allocations(id)
    on delete restrict,

  builder_id uuid not null
    references auth.users(id)
    on delete restrict,

  asset_key text not null unique,

  grid_version integer not null
    check (grid_version > 0),

  x_start integer not null,
  y_start integer not null,
  width integer not null
    check (width > 0),
  height integer not null
    check (height > 0),

  pixel_count integer not null
    check (pixel_count >= 50),

  owner_wallet text,

  network text not null
    check (network in ('devnet', 'mainnet-beta')),

  mint_address text unique,
  mint_transaction_signature text unique,
  metadata_uri text,

  asset_status text not null default 'pending'
    check (
      asset_status in (
        'pending',
        'minting',
        'on_chain',
        'mint_failed',
        'transferred'
      )
    ),

  minted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (x_start >= 0 and x_start < 1000),
  check (y_start >= 0 and y_start < 1000),
  check (x_start + width <= 1000),
  check (y_start + height <= 1000),
  check (pixel_count = width * height)
);

alter table public.mars_pixel_blockchain_assets
  enable row level security;

revoke all
on table public.mars_pixel_blockchain_assets
from public, anon, authenticated;


-- ------------------------------------------------------------
-- 5. Read-only Solana checkout configuration
-- ------------------------------------------------------------

create or replace function public.get_mars_pixel_solana_status_v1()
returns table (
  network text,
  treasury_address text,
  payment_status text,
  pricing_version integer,
  minimum_pixels integer
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    config.network,
    config.treasury_address,
    config.payment_status,
    coalesce(pricing.pricing_version, 1)::integer,
    coalesce(pricing.minimum_pixels, 50)::integer
  from public.mars_pixel_solana_config as config
  left join lateral (
    select
      active_version.pricing_version,
      min(tier.min_pixels)::integer as minimum_pixels
    from (
      select max(t.pricing_version) as pricing_version
      from public.mars_pixel_solana_price_tiers as t
      where t.active = true
    ) as active_version
    join public.mars_pixel_solana_price_tiers as tier
      on tier.pricing_version = active_version.pricing_version
     and tier.active = true
    group by active_version.pricing_version
  ) as pricing on true
  where config.id = 1;
$$;

revoke all
on function public.get_mars_pixel_solana_status_v1()
from public;

grant execute
on function public.get_mars_pixel_solana_status_v1()
to anon, authenticated;


comment on table public.mars_pixel_solana_payment_orders is
'Solana Mars Pixel payment orders. Server-authoritative snapshots correlate a Mars Pixel reservation with an expected native SOL payment. A transaction signature alone never proves payment until backend verification succeeds.';

comment on table public.mars_pixel_blockchain_assets is
'BOBU Mars blockchain asset registry. V26 creates registry state only; minting is a separate retryable lifecycle and must never determine whether a verified paid Mars Pixel allocation remains owned.';



-- ------------------------------------------------------------
-- 6. Payment-order idempotency and wallet binding
-- ------------------------------------------------------------

alter table public.mars_pixel_solana_payment_orders
  add column idempotency_key text not null;

alter table public.mars_pixel_solana_payment_orders
  add constraint mars_pixel_solana_order_idempotency_key_check
    check (
      char_length(trim(idempotency_key))
      between 1 and 255
    ),
  add constraint mars_pixel_solana_buyer_wallet_check
    check (
      buyer_wallet is null
      or char_length(trim(buyer_wallet))
         between 32 and 44
    );

create unique index
  mars_pixel_solana_builder_idempotency_uidx
on public.mars_pixel_solana_payment_orders (
  builder_id,
  idempotency_key
);


-- ------------------------------------------------------------
-- 7. Prevent GP checkout while an active Solana order exists
--
-- Existing GP preparation uses the same reservation advisory
-- lock. This trigger closes the remaining cross-settlement gap:
-- one reservation cannot simultaneously enter GP and SOL
-- settlement.
-- ------------------------------------------------------------

create or replace function
public.guard_mars_pixel_gp_purchase_against_solana_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('prepared', 'committed')
     and exists (
       select 1
       from public.mars_pixel_solana_payment_orders as sol_order
       where sol_order.reservation_id = new.reservation_id
         and sol_order.payment_status in (
           'awaiting_payment',
           'detected',
           'verifying',
           'verified'
         )
         and (
           sol_order.payment_status = 'verified'
           or sol_order.expires_at > now()
         )
     ) then
    raise exception 'MARS_PIXEL_SOLANA_ORDER_ALREADY_ACTIVE'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all
on function public.guard_mars_pixel_gp_purchase_against_solana_v1()
from public, anon, authenticated;

drop trigger if exists
  mars_pixel_gp_purchase_solana_guard
on public.mars_pixel_purchase_intents;

create trigger mars_pixel_gp_purchase_solana_guard
before insert or update of reservation_id, status
on public.mars_pixel_purchase_intents
for each row
execute function
  public.guard_mars_pixel_gp_purchase_against_solana_v1();


-- ------------------------------------------------------------
-- 8. Server-authoritative Solana payment-order preparation
--
-- IMPORTANT:
--   - service_role only
--   - reservation geometry comes from DB
--   - pricing comes from DB
--   - client cannot choose amount
--   - client cannot choose treasury
--   - client cannot choose network
--   - buyer wallet is bound to the order
-- ------------------------------------------------------------

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

  if v_network_config.commercial_status <> 'active' then
    raise exception 'MARS_PIXEL_COMMERCIAL_LOCKED'
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

  if v_solana_config.payment_status
       not in ('devnet_testing', 'active') then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENTS_DISABLED'
      using errcode = '55000';
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
'Service-role-only server-authoritative Solana Mars Pixel checkout preparation. Reservation geometry, pricing tier, network, treasury and lamport amount are determined by trusted database state. Buyer wallet and idempotency key are bound to the order. No blockchain transaction is considered paid or verified by this function.';


commit;

-- ============================================================
-- V26 HARDENING
-- Prevent overlapping active SOL price tiers inside the same
-- pricing_version. Serialized with an advisory transaction lock
-- so concurrent admin writes cannot race past the validation.
-- ============================================================

create or replace function public.guard_mars_pixel_solana_price_tier_overlap_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_solana_price_tiers_v1')::bigint
  );

  if new.active then
    if exists (
      select 1
      from public.mars_pixel_solana_price_tiers as existing
      where existing.active
        and existing.pricing_version = new.pricing_version
        and existing.id <> new.id
        and int4range(
              existing.min_pixels,
              coalesce(existing.max_pixels, 2147483646) + 1,
              '[)'
            )
            &&
            int4range(
              new.min_pixels,
              coalesce(new.max_pixels, 2147483646) + 1,
              '[)'
            )
    ) then
      raise exception 'MARS_PIXEL_SOLANA_PRICE_TIER_OVERLAP';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists
  mars_pixel_solana_price_tier_overlap_guard
on public.mars_pixel_solana_price_tiers;

create trigger mars_pixel_solana_price_tier_overlap_guard
before insert or update of
  pricing_version,
  min_pixels,
  max_pixels,
  active
on public.mars_pixel_solana_price_tiers
for each row
execute function public.guard_mars_pixel_solana_price_tier_overlap_v1();

comment on function
  public.guard_mars_pixel_solana_price_tier_overlap_v1()
is
  'Rejects overlapping active Mars Pixel SOL price tiers within the same pricing version. Uses an advisory transaction lock to serialize concurrent tier mutations.';


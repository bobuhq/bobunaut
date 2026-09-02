begin;

create table public.mars_pixel_purchase_intents (
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
  width integer not null,
  height integer not null,

  block_count integer not null
    check (block_count > 0),

  pixel_count integer not null
    check (pixel_count > 0),

  currency_code text not null
    check (
      char_length(trim(currency_code)) between 1 and 32
      and currency_code = upper(trim(currency_code))
    ),

  price_per_block bigint not null
    check (price_per_block > 0),

  total_price bigint not null
    check (total_price > 0),

  status text not null default 'prepared'
    check (
      status in (
        'prepared',
        'committed',
        'cancelled',
        'failed'
      )
    ),

  idempotency_key text not null
    check (
      char_length(trim(idempotency_key))
      between 1 and 255
    ),

  allocation_id uuid
    references public.mars_pixel_allocations(id)
    on delete restrict,

  prepared_at timestamptz not null default now(),
  committed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mars_pixel_purchase_intents_builder_idempotency_unique
    unique (builder_id, idempotency_key),

  constraint mars_pixel_purchase_intents_reservation_unique
    unique (reservation_id),

  check (x_start >= 0 and x_start < 1000),
  check (y_start >= 0 and y_start < 1000),
  check (width > 0),
  check (height > 0),
  check (x_start + width <= 1000),
  check (y_start + height <= 1000),

  check (mod(x_start, 10) = 0),
  check (mod(y_start, 10) = 0),
  check (mod(width, 10) = 0),
  check (mod(height, 10) = 0),

  check (pixel_count = width * height),

  check (
    block_count =
      (width / 10) *
      (height / 10)
  ),

  check (
    status <> 'committed'
    or (
      allocation_id is not null
      and committed_at is not null
    )
  ),

  check (
    status <> 'prepared'
    or (
      allocation_id is null
      and committed_at is null
      and cancelled_at is null
    )
  ),

  check (
    status <> 'cancelled'
    or cancelled_at is not null
  )
);

create index mars_pixel_purchase_intents_builder_idx
  on public.mars_pixel_purchase_intents (
    builder_id,
    status,
    created_at desc
  );

create index mars_pixel_purchase_intents_status_idx
  on public.mars_pixel_purchase_intents (
    status,
    created_at desc
  );

alter table public.mars_pixel_purchase_intents
  enable row level security;

revoke all
on table public.mars_pixel_purchase_intents
from public, anon, authenticated;

create or replace function public.prepare_mars_pixel_purchase_v1(
  p_builder_id uuid,
  p_reservation_id uuid,
  p_idempotency_key text
)
returns table (
  purchase_intent_id uuid,
  purchase_status text,
  reservation_id uuid,
  grid_version integer,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  block_count integer,
  pixel_count integer,
  currency_code text,
  price_per_block bigint,
  total_price bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_commercial_status text;
  v_grid_version integer;

  v_pricing_status text;
  v_currency_code text;
  v_price_per_block bigint;

  v_reservation public.mars_pixel_reservations%rowtype;

  v_existing public.mars_pixel_purchase_intents%rowtype;

  v_reserved_overlap_count bigint;
  v_owned_overlap_count bigint;
  v_other_reservation_overlap_count bigint;

  v_total_price bigint;
  v_purchase_intent_id uuid;
begin
  if p_builder_id is null then
    raise exception 'BUILDER_ID_REQUIRED'
      using errcode = '22004';
  end if;

  if p_reservation_id is null then
    raise exception 'RESERVATION_ID_REQUIRED'
      using errcode = '22004';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) = 0
     or char_length(trim(p_idempotency_key)) > 255 then
    raise exception 'INVALID_IDEMPOTENCY_KEY'
      using errcode = '22023';
  end if;

  select
    config.grid_version,
    config.commercial_status
  into
    v_grid_version,
    v_commercial_status
  from public.mars_pixel_network_config as config
  where config.id = 1
  for update;

  if not found then
    raise exception
      'Mars Pixel Network configuration does not exist.';
  end if;

  if v_commercial_status <> 'active' then
    raise exception 'MARS_PIXEL_COMMERCIAL_LOCKED'
      using errcode = '55000';
  end if;

  select
    pricing.pricing_status,
    pricing.currency_code,
    pricing.price_per_block
  into
    v_pricing_status,
    v_currency_code,
    v_price_per_block
  from public.mars_pixel_pricing_config as pricing
  where pricing.id = 1
    and pricing.grid_version = v_grid_version
  for update;

  if not found
     or v_pricing_status is distinct from 'configured'
     or v_currency_code is null
     or v_price_per_block is null then
    raise exception 'PRICING_NOT_CONFIGURED'
      using errcode = '55000';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_reservation_v1')::bigint
  );

  select *
  into v_existing
  from public.mars_pixel_purchase_intents as purchase
  where purchase.builder_id = p_builder_id
    and purchase.idempotency_key =
      trim(p_idempotency_key)
  for update;

  if found then
    if v_existing.reservation_id <> p_reservation_id then
      raise exception 'MARS_PIXEL_IDEMPOTENCY_CONFLICT'
        using errcode = '23505';
    end if;

    return query
    select
      v_existing.id,
      v_existing.status,
      v_existing.reservation_id,
      v_existing.grid_version,
      v_existing.x_start,
      v_existing.y_start,
      v_existing.width,
      v_existing.height,
      v_existing.block_count,
      v_existing.pixel_count,
      v_existing.currency_code,
      v_existing.price_per_block,
      v_existing.total_price;

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

  if v_reservation.grid_version <> v_grid_version then
    raise exception 'MARS_PIXEL_GRID_VERSION_MISMATCH'
      using errcode = '55000';
  end if;

  if v_reservation.status <> 'active' then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_ACTIVE'
      using errcode = '55000';
  end if;

  if v_reservation.expires_at <= now() then
    update public.mars_pixel_reservations as reservation
    set
      status = 'expired',
      updated_at = now()
    where reservation.id = v_reservation.id
      and reservation.status = 'active';

    raise exception 'MARS_PIXEL_RESERVATION_EXPIRED'
      using errcode = '55000';
  end if;

  select count(*)
  into v_reserved_overlap_count
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start <
      v_reservation.x_start + v_reservation.width
    and zone.x_start + zone.width >
      v_reservation.x_start
    and zone.y_start <
      v_reservation.y_start + v_reservation.height
    and zone.y_start + zone.height >
      v_reservation.y_start;

  if v_reserved_overlap_count > 0 then
    raise exception 'MARS_PIXEL_RESERVED_ZONE'
      using errcode = '55000';
  end if;

  select count(*)
  into v_owned_overlap_count
  from public.mars_pixel_allocations as allocation
  where allocation.grid_version = v_grid_version
    and allocation.allocation_status = 'owned'
    and allocation.x_start <
      v_reservation.x_start + v_reservation.width
    and allocation.x_start + allocation.width >
      v_reservation.x_start
    and allocation.y_start <
      v_reservation.y_start + v_reservation.height
    and allocation.y_start + allocation.height >
      v_reservation.y_start;

  if v_owned_overlap_count > 0 then
    raise exception 'MARS_PIXEL_ALREADY_OWNED'
      using errcode = '55000';
  end if;

  select count(*)
  into v_other_reservation_overlap_count
  from public.mars_pixel_reservations as reservation
  where reservation.id <> v_reservation.id
    and reservation.grid_version = v_grid_version
    and reservation.status = 'active'
    and reservation.expires_at > now()
    and reservation.x_start <
      v_reservation.x_start + v_reservation.width
    and reservation.x_start + reservation.width >
      v_reservation.x_start
    and reservation.y_start <
      v_reservation.y_start + v_reservation.height
    and reservation.y_start + reservation.height >
      v_reservation.y_start;

  if v_other_reservation_overlap_count > 0 then
    raise exception 'MARS_PIXEL_ALREADY_RESERVED'
      using errcode = '55000';
  end if;

  if v_reservation.block_count > 0
     and v_price_per_block >
       (
         9223372036854775807::bigint /
         v_reservation.block_count::bigint
       ) then
    raise exception 'MARS_PIXEL_PRICE_OVERFLOW'
      using errcode = '22003';
  end if;

  v_total_price :=
    v_price_per_block *
    v_reservation.block_count::bigint;

  insert into public.mars_pixel_purchase_intents (
    builder_id,
    reservation_id,
    grid_version,
    x_start,
    y_start,
    width,
    height,
    block_count,
    pixel_count,
    currency_code,
    price_per_block,
    total_price,
    status,
    idempotency_key
  )
  values (
    p_builder_id,
    v_reservation.id,
    v_grid_version,
    v_reservation.x_start,
    v_reservation.y_start,
    v_reservation.width,
    v_reservation.height,
    v_reservation.block_count,
    v_reservation.pixel_count,
    v_currency_code,
    v_price_per_block,
    v_total_price,
    'prepared',
    trim(p_idempotency_key)
  )
  returning mars_pixel_purchase_intents.id
  into v_purchase_intent_id;

  return query
  select
    v_purchase_intent_id,
    'prepared'::text,
    v_reservation.id,
    v_grid_version,
    v_reservation.x_start,
    v_reservation.y_start,
    v_reservation.width,
    v_reservation.height,
    v_reservation.block_count,
    v_reservation.pixel_count,
    v_currency_code,
    v_price_per_block,
    v_total_price;
end;
$$;

revoke all
on function public.prepare_mars_pixel_purchase_v1(
  uuid,
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function public.prepare_mars_pixel_purchase_v1(
  uuid,
  uuid,
  text
)
to service_role;

comment on table public.mars_pixel_purchase_intents is
'Server-authoritative Mars Pixel purchase preparation records. Prepared intents are not ownership, payment, checkout or GP debit records.';

comment on function public.prepare_mars_pixel_purchase_v1(
  uuid,
  uuid,
  text
) is
'Service-role-only purchase preparation foundation. Requires active commercial network, configured pricing and a valid owned-by-builder active reservation. Creates no pixel allocation, ownership, GP debit, payment or checkout.';

commit;

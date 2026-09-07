begin;

create or replace function public.reserve_mars_pixel_selection_solana_devnet_v1(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer
)
returns public.mars_pixel_reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();

  v_grid_width integer;
  v_grid_height integer;
  v_grid_version integer;
  v_commercial_status text;
  v_solana_network text;
  v_solana_payment_status text;

  v_x_start integer;
  v_y_start integer;
  v_x_end integer;
  v_y_end integer;
  v_width integer;
  v_height integer;
  v_pixel_count integer;

  v_expires_at timestamptz := now() + interval '15 minutes';
  v_reservation public.mars_pixel_reservations%rowtype;
begin
  if v_builder_id is null then
    raise exception 'MARS_PIXEL_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select
    config.grid_width,
    config.grid_height,
    config.grid_version,
    config.commercial_status
  into
    v_grid_width,
    v_grid_height,
    v_grid_version,
    v_commercial_status
  from public.mars_pixel_network_config as config
  where config.id = 1
  for update;

  if not found then
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  /*
   * SOLANA DEVNET TEST GATE
   *
   * The general Mars commercial network may remain locked.
   * This reservation path is available only while the trusted
   * Solana configuration is explicitly Devnet + devnet_testing.
   *
   * Mainnet and real commercial operation remain locked.
   */
  select
    solana.network,
    solana.payment_status
  into
    v_solana_network,
    v_solana_payment_status
  from public.mars_pixel_solana_config as solana
  where solana.id = 1
  for update;

  if not found then
    raise exception 'MARS_PIXEL_SOLANA_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  if v_solana_network <> 'devnet'
     or v_solana_payment_status <> 'devnet_testing' then
    raise exception 'MARS_PIXEL_SOLANA_DEVNET_LOCKED'
      using errcode = '55000';
  end if;

  if p_anchor_x is null
     or p_anchor_y is null
     or p_target_x is null
     or p_target_y is null
     or p_anchor_x < 0
     or p_anchor_y < 0
     or p_target_x < 0
     or p_target_y < 0
     or p_anchor_x >= v_grid_width
     or p_anchor_y >= v_grid_height
     or p_target_x >= v_grid_width
     or p_target_y >= v_grid_height then
    raise exception 'MARS_PIXEL_SELECTION_OUTSIDE_GRID'
      using errcode = '22023';
  end if;

  v_x_start := least(p_anchor_x, p_target_x);
  v_y_start := least(p_anchor_y, p_target_y);
  v_x_end := greatest(p_anchor_x, p_target_x);
  v_y_end := greatest(p_anchor_y, p_target_y);

  v_width := v_x_end - v_x_start + 1;
  v_height := v_y_end - v_y_start + 1;
  v_pixel_count := v_width * v_height;

  if v_pixel_count < 50 then
    raise exception 'MARS_PIXEL_MINIMUM_PURCHASE_50_PIXELS'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_reservation_v1')
  );

  update public.mars_pixel_reservations
  set
    status = 'expired',
    updated_at = now()
  where status = 'active'
    and expires_at <= now();

  if exists (
    select 1
    from public.mars_pixel_reserved_zones as zone
    where zone.active = true
      and zone.x_start < v_x_end + 1
      and zone.x_start + zone.width > v_x_start
      and zone.y_start < v_y_end + 1
      and zone.y_start + zone.height > v_y_start
  ) then
    raise exception 'MARS_PIXEL_SELECTION_PROTECTED'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and allocation.x_start < v_x_end + 1
      and allocation.x_start + allocation.width > v_x_start
      and allocation.y_start < v_y_end + 1
      and allocation.y_start + allocation.height > v_y_start
  ) then
    raise exception 'MARS_PIXEL_SELECTION_ALREADY_OWNED'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_reservations as reservation
    where reservation.grid_version = v_grid_version
      and reservation.status = 'active'
      and reservation.expires_at > now()
      and reservation.x_start < v_x_end + 1
      and reservation.x_start + reservation.width > v_x_start
      and reservation.y_start < v_y_end + 1
      and reservation.y_start + reservation.height > v_y_start
  ) then
    raise exception 'MARS_PIXEL_SELECTION_ALREADY_RESERVED'
      using errcode = '55000';
  end if;

  insert into public.mars_pixel_reservations (
    builder_id,
    grid_version,
    x_start,
    y_start,
    width,
    height,
    block_x_start,
    block_y_start,
    block_x_end,
    block_y_end,
    block_count,
    pixel_count,
    status,
    expires_at
  )
  values (
    v_builder_id,
    v_grid_version,
    v_x_start,
    v_y_start,
    v_width,
    v_height,
    v_x_start,
    v_y_start,
    v_x_end,
    v_y_end,
    v_pixel_count,
    v_pixel_count,
    'active',
    v_expires_at
  )
  returning *
  into v_reservation;

  return v_reservation;
end;
$$;


revoke all
on function public.reserve_mars_pixel_selection_solana_devnet_v1(
  integer,
  integer,
  integer,
  integer
)
from public, anon;

grant execute
on function public.reserve_mars_pixel_selection_solana_devnet_v1(
  integer,
  integer,
  integer,
  integer
)
to authenticated;

comment on function public.reserve_mars_pixel_selection_solana_devnet_v1(
  integer,
  integer,
  integer,
  integer
) is
'Solana Devnet-only Mars Pixel reservation path. Requires trusted Solana config network=devnet and payment_status=devnet_testing. General commercial network remains locked.';

commit;

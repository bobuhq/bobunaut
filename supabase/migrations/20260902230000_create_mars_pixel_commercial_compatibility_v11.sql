begin;

do $$
begin
  if exists (
    select 1
    from public.mars_pixel_reservations
  ) then
    raise exception 'V11_ABORT_RESERVATIONS_EXIST';
  end if;

  if exists (
    select 1
    from public.mars_pixel_purchase_intents
  ) then
    raise exception 'V11_ABORT_PURCHASE_INTENTS_EXIST';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations
  ) then
    raise exception 'V11_ABORT_ALLOCATIONS_EXIST';
  end if;

  if exists (
    select 1
    from public.mars_advertisers
  ) then
    raise exception 'V11_ABORT_ADVERTISERS_EXIST';
  end if;
end
$$;

do $$
declare
  v_commercial_status text;
begin
  select commercial_status
  into v_commercial_status
  from public.mars_pixel_network_config
  where id = 1
  for update;

  if not found then
    raise exception 'V11_ABORT_NETWORK_CONFIG_MISSING';
  end if;

  if v_commercial_status <> 'locked' then
    raise exception 'V11_ABORT_COMMERCIAL_NETWORK_NOT_LOCKED';
  end if;
end
$$;

alter table public.mars_pixel_purchase_intents
  add column if not exists price_per_pixel bigint;

alter table public.mars_pixel_purchase_intents
  add constraint mars_pixel_purchase_intents_price_per_pixel_positive_v11
  check (
    price_per_pixel is null
    or price_per_pixel > 0
  );

comment on column public.mars_pixel_purchase_intents.price_per_pixel is
'Settlement price per individual Mars Pixel in currency_code units. This is separate from the USD reference valuation.';

create or replace function public.get_mars_pixel_quote_v2(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer
)
returns table (
  x_start integer,
  y_start integer,
  x_end integer,
  y_end integer,
  width integer,
  height integer,
  pixel_count integer,
  grid_version integer,
  selection_status text,
  quote_status text,
  quotable boolean,
  settlement_currency_code text,
  settlement_price_per_pixel bigint,
  settlement_total_price bigint,
  reference_currency_code text,
  reference_price_per_pixel_minor bigint,
  reference_total_value_minor bigint,
  minimum_purchase_pixels integer,
  reserved_overlap_count bigint,
  owned_overlap_count bigint,
  active_reservation_overlap_count bigint,
  reserved_zone_code text,
  reserved_zone_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grid_width integer;
  v_grid_height integer;
  v_grid_version integer;
  v_commercial_status text;

  v_x_start integer;
  v_y_start integer;
  v_x_end integer;
  v_y_end integer;
  v_width integer;
  v_height integer;
  v_pixel_count integer;

  v_pricing_status text;
  v_settlement_currency text;
  v_legacy_price_per_block bigint;
  v_reference_currency text;
  v_reference_price bigint;
  v_minimum_pixels integer;

  v_reserved_count bigint;
  v_owned_count bigint;
  v_active_reservation_count bigint;
  v_reserved_zone_code text;
  v_reserved_zone_name text;

  v_selection_status text;
  v_quote_status text;
  v_quotable boolean := false;
  v_settlement_price_per_pixel bigint;
  v_settlement_total bigint;
  v_reference_total bigint;
begin
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
  where config.id = 1;

  if not found then
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
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

  select
    pricing.pricing_status,
    pricing.currency_code,
    pricing.price_per_block,
    pricing.reference_currency_code,
    pricing.price_per_pixel_minor,
    pricing.minimum_purchase_pixels
  into
    v_pricing_status,
    v_settlement_currency,
    v_legacy_price_per_block,
    v_reference_currency,
    v_reference_price,
    v_minimum_pixels
  from public.mars_pixel_pricing_config as pricing
  where pricing.id = 1
    and pricing.grid_version = v_grid_version;

  if not found then
    v_pricing_status := 'unconfigured';
    v_settlement_currency := null;
    v_legacy_price_per_block := null;
    v_reference_currency := null;
    v_reference_price := null;
    v_minimum_pixels := 50;
  end if;

  v_minimum_pixels := coalesce(v_minimum_pixels, 50);

  select
    count(*),
    min(zone.zone_code),
    min(zone.zone_name)
  into
    v_reserved_count,
    v_reserved_zone_code,
    v_reserved_zone_name
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_end + 1
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_end + 1
    and zone.y_start + zone.height > v_y_start;

  select count(*)
  into v_owned_count
  from public.mars_pixel_allocations as allocation
  where allocation.grid_version = v_grid_version
    and allocation.allocation_status = 'owned'
    and allocation.x_start < v_x_end + 1
    and allocation.x_start + allocation.width > v_x_start
    and allocation.y_start < v_y_end + 1
    and allocation.y_start + allocation.height > v_y_start;

  select count(*)
  into v_active_reservation_count
  from public.mars_pixel_reservations as reservation
  where reservation.grid_version = v_grid_version
    and reservation.status = 'active'
    and reservation.expires_at > now()
    and reservation.x_start < v_x_end + 1
    and reservation.x_start + reservation.width > v_x_start
    and reservation.y_start < v_y_end + 1
    and reservation.y_start + reservation.height > v_y_start;

  if v_reserved_count > 0 then
    v_selection_status := 'reserved';
  elsif v_owned_count > 0 then
    v_selection_status := 'owned';
  elsif v_active_reservation_count > 0 then
    v_selection_status := 'reserved';
  else
    v_selection_status := 'available';
  end if;

  if v_reference_price is not null
     and v_pixel_count > 0
     and v_reference_price >
       9223372036854775807::bigint /
       v_pixel_count::bigint then
    raise exception 'MARS_PIXEL_REFERENCE_VALUE_OVERFLOW'
      using errcode = '22003';
  end if;

  if v_reference_price is not null then
    v_reference_total :=
      v_reference_price * v_pixel_count::bigint;
  end if;

  v_settlement_price_per_pixel := null;
  v_settlement_total := null;

  if v_pixel_count < v_minimum_pixels then
    v_quote_status := 'below_minimum';
  elsif v_selection_status <> 'available' then
    v_quote_status := v_selection_status;
  elsif v_commercial_status <> 'active' then
    v_quote_status := 'commercial_locked';
  elsif v_pricing_status <> 'configured'
        or v_settlement_currency is null
        or v_legacy_price_per_block is null then
    v_quote_status := 'settlement_unconfigured';
  else
    v_quote_status := 'settlement_requires_pixel_pricing';
  end if;

  v_quotable := false;

  return query
  select
    v_x_start,
    v_y_start,
    v_x_end,
    v_y_end,
    v_width,
    v_height,
    v_pixel_count,
    v_grid_version,
    v_selection_status,
    v_quote_status,
    v_quotable,
    v_settlement_currency,
    v_settlement_price_per_pixel,
    v_settlement_total,
    v_reference_currency,
    v_reference_price,
    v_reference_total,
    v_minimum_pixels,
    v_reserved_count,
    v_owned_count,
    v_active_reservation_count,
    v_reserved_zone_code,
    v_reserved_zone_name;
end;
$$;

revoke all on function public.get_mars_pixel_quote_v2(
  integer,
  integer,
  integer,
  integer
) from public;

revoke all on function public.get_mars_pixel_quote_v2(
  integer,
  integer,
  integer,
  integer
) from anon;

grant execute on function public.get_mars_pixel_quote_v2(
  integer,
  integer,
  integer,
  integer
) to authenticated;

comment on function public.get_mars_pixel_quote_v2(
  integer,
  integer,
  integer,
  integer
) is
'Read-only pixel-native Mars Pixel quote foundation. USD reference valuation is informational and does not enable settlement, reservation, ownership, checkout or GP debit.';

comment on column public.mars_pixel_purchase_intents.block_count is
'Legacy compatibility field. In pixel-native geometry this must equal pixel_count.';

comment on column public.mars_pixel_purchase_intents.price_per_block is
'Legacy settlement field retained for compatibility. New pixel-native settlement must not infer USD reference valuation from this field.';

commit;

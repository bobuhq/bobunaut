begin;

create table public.mars_pixel_pricing_config (
  id smallint primary key
    check (id = 1),

  grid_version integer not null
    check (grid_version > 0),

  currency_code text,
  price_per_block bigint,

  pricing_status text not null default 'unconfigured'
    check (
      pricing_status in (
        'unconfigured',
        'configured',
        'paused',
        'archived'
      )
    ),

  configured_at timestamptz,
  activated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    currency_code is null
    or (
      char_length(trim(currency_code)) between 1 and 32
      and currency_code = upper(trim(currency_code))
    )
  ),

  check (
    price_per_block is null
    or price_per_block > 0
  ),

  check (
    pricing_status = 'unconfigured'
    or (
      currency_code is not null
      and price_per_block is not null
      and configured_at is not null
    )
  ),

  check (
    activated_at is null
    or pricing_status in ('configured', 'paused', 'archived')
  )
);

insert into public.mars_pixel_pricing_config (
  id,
  grid_version,
  currency_code,
  price_per_block,
  pricing_status,
  configured_at,
  activated_at
)
select
  1,
  config.grid_version,
  null,
  null,
  'unconfigured',
  null,
  null
from public.mars_pixel_network_config as config
where config.id = 1;

alter table public.mars_pixel_pricing_config
  enable row level security;

revoke all
on table public.mars_pixel_pricing_config
from public, anon, authenticated;

create or replace function public.get_mars_pixel_pricing_status_v1()
returns table (
  grid_version integer,
  pricing_status text,
  currency_code text,
  price_per_block bigint,
  configured boolean,
  commercial_status text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    network.grid_version,
    pricing.pricing_status,
    pricing.currency_code,
    pricing.price_per_block,
    (
      pricing.pricing_status = 'configured'
      and pricing.currency_code is not null
      and pricing.price_per_block is not null
    ) as configured,
    network.commercial_status
  from public.mars_pixel_network_config as network
  left join public.mars_pixel_pricing_config as pricing
    on pricing.id = 1
   and pricing.grid_version = network.grid_version
  where network.id = 1;
$$;

revoke all
on function public.get_mars_pixel_pricing_status_v1()
from public;

grant execute
on function public.get_mars_pixel_pricing_status_v1()
to anon, authenticated;

create or replace function public.get_mars_pixel_quote_v1(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer
)
returns table (
  block_x_start integer,
  block_y_start integer,
  block_x_end integer,
  block_y_end integer,
  x_start integer,
  y_start integer,
  x_end integer,
  y_end integer,
  width integer,
  height integer,
  block_columns integer,
  block_rows integer,
  block_count integer,
  pixel_count integer,
  grid_version integer,
  selection_status text,
  quote_status text,
  quotable boolean,
  currency_code text,
  price_per_block bigint,
  total_price bigint,
  reserved_overlap_count bigint,
  owned_overlap_count bigint,
  active_reservation_overlap_count bigint,
  reserved_zone_code text,
  reserved_zone_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_grid_width integer;
  v_grid_height integer;
  v_grid_version integer;
  v_commercial_status text;

  v_pricing_status text;
  v_currency_code text;
  v_price_per_block bigint;

  v_block_size constant integer := 10;

  v_anchor_block_x integer;
  v_anchor_block_y integer;
  v_target_block_x integer;
  v_target_block_y integer;

  v_block_x_start integer;
  v_block_y_start integer;
  v_block_x_end integer;
  v_block_y_end integer;

  v_x_start integer;
  v_y_start integer;
  v_x_end integer;
  v_y_end integer;

  v_width integer;
  v_height integer;
  v_block_columns integer;
  v_block_rows integer;
  v_block_count integer;
  v_pixel_count integer;

  v_reserved_overlap_count bigint;
  v_owned_overlap_count bigint;
  v_active_reservation_overlap_count bigint;

  v_reserved_zone_code text;
  v_reserved_zone_name text;

  v_selection_status text;
  v_quote_status text;
  v_quotable boolean;
  v_total_price bigint;
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
    raise exception
      'Mars Pixel Network configuration does not exist.';
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
    raise exception
      'Mars pixel selection is outside the canonical grid.';
  end if;

  if mod(v_grid_width, v_block_size) <> 0
     or mod(v_grid_height, v_block_size) <> 0 then
    raise exception
      'Mars Pixel Network grid is not compatible with the canonical block size.';
  end if;

  v_anchor_block_x :=
    floor(p_anchor_x::numeric / v_block_size)::integer;

  v_anchor_block_y :=
    floor(p_anchor_y::numeric / v_block_size)::integer;

  v_target_block_x :=
    floor(p_target_x::numeric / v_block_size)::integer;

  v_target_block_y :=
    floor(p_target_y::numeric / v_block_size)::integer;

  v_block_x_start :=
    least(v_anchor_block_x, v_target_block_x);

  v_block_y_start :=
    least(v_anchor_block_y, v_target_block_y);

  v_block_x_end :=
    greatest(v_anchor_block_x, v_target_block_x);

  v_block_y_end :=
    greatest(v_anchor_block_y, v_target_block_y);

  v_x_start := v_block_x_start * v_block_size;
  v_y_start := v_block_y_start * v_block_size;

  v_block_columns :=
    v_block_x_end - v_block_x_start + 1;

  v_block_rows :=
    v_block_y_end - v_block_y_start + 1;

  v_width := v_block_columns * v_block_size;
  v_height := v_block_rows * v_block_size;

  v_x_end := v_x_start + v_width - 1;
  v_y_end := v_y_start + v_height - 1;

  v_block_count :=
    v_block_columns * v_block_rows;

  v_pixel_count :=
    v_width * v_height;

  select
    count(*),
    min(zone.zone_code),
    min(zone.zone_name)
  into
    v_reserved_overlap_count,
    v_reserved_zone_code,
    v_reserved_zone_name
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_start + v_width
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_start + v_height
    and zone.y_start + zone.height > v_y_start;

  select count(*)
  into v_owned_overlap_count
  from public.mars_pixel_allocations as allocation
  where allocation.grid_version = v_grid_version
    and allocation.allocation_status = 'owned'
    and allocation.x_start < v_x_start + v_width
    and allocation.x_start + allocation.width > v_x_start
    and allocation.y_start < v_y_start + v_height
    and allocation.y_start + allocation.height > v_y_start;

  select count(*)
  into v_active_reservation_overlap_count
  from public.mars_pixel_reservations as reservation
  where reservation.grid_version = v_grid_version
    and reservation.status = 'active'
    and reservation.expires_at > now()
    and reservation.x_start < v_x_start + v_width
    and reservation.x_start + reservation.width > v_x_start
    and reservation.y_start < v_y_start + v_height
    and reservation.y_start + reservation.height > v_y_start;

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
    and pricing.grid_version = v_grid_version;

  if v_reserved_overlap_count > 0 then
    v_selection_status := 'reserved';
    v_quote_status := 'MARS_PIXEL_RESERVED_ZONE';
    v_quotable := false;

  elsif v_owned_overlap_count > 0 then
    v_selection_status := 'owned';
    v_quote_status := 'MARS_PIXEL_ALREADY_OWNED';
    v_quotable := false;

  elsif v_active_reservation_overlap_count > 0 then
    v_selection_status := 'reserved';
    v_quote_status := 'MARS_PIXEL_ALREADY_RESERVED';
    v_quotable := false;

  else
    v_selection_status := 'available';

    if v_commercial_status <> 'active' then
      v_quote_status := 'MARS_PIXEL_COMMERCIAL_LOCKED';
      v_quotable := false;

    elsif v_pricing_status is distinct from 'configured'
       or v_currency_code is null
       or v_price_per_block is null then
      v_quote_status := 'PRICING_NOT_CONFIGURED';
      v_quotable := false;

    else
      v_quote_status := 'QUOTABLE';
      v_quotable := true;
    end if;
  end if;

  if v_quotable then
    if v_block_count > 0
       and v_price_per_block >
         (9223372036854775807::bigint / v_block_count::bigint) then
      raise exception 'MARS_PIXEL_PRICE_OVERFLOW'
        using errcode = '22003';
    end if;

    v_total_price :=
      v_price_per_block * v_block_count::bigint;
  else
    v_total_price := null;
  end if;

  return query
  select
    v_block_x_start,
    v_block_y_start,
    v_block_x_end,
    v_block_y_end,
    v_x_start,
    v_y_start,
    v_x_end,
    v_y_end,
    v_width,
    v_height,
    v_block_columns,
    v_block_rows,
    v_block_count,
    v_pixel_count,
    v_grid_version,
    v_selection_status,
    v_quote_status,
    v_quotable,
    v_currency_code,
    v_price_per_block,
    v_total_price,
    v_reserved_overlap_count,
    v_owned_overlap_count,
    v_active_reservation_overlap_count,
    v_reserved_zone_code,
    v_reserved_zone_name;
end;
$$;

revoke all
on function public.get_mars_pixel_quote_v1(
  integer,
  integer,
  integer,
  integer
)
from public;

grant execute
on function public.get_mars_pixel_quote_v1(
  integer,
  integer,
  integer,
  integer
)
to anon, authenticated;

comment on table public.mars_pixel_pricing_config is
'Server-authoritative Mars Pixel Network pricing configuration. V6 creates no real price and keeps pricing unconfigured until an explicit future commercial decision.';

comment on function public.get_mars_pixel_pricing_status_v1() is
'Read-only Mars Pixel Network pricing status. Does not configure pricing, reserve pixels, spend GP, create ownership, perform payment or checkout.';

comment on function public.get_mars_pixel_quote_v1(
  integer,
  integer,
  integer,
  integer
) is
'Read-only server-authoritative Mars Pixel Network quote engine. Canonicalizes selection and validates protected zones, ownership, active reservations, commercial status and pricing configuration. No reservation, GP debit, ownership, payment or checkout mutation.';

commit;

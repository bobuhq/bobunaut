begin;


do $$
begin
  if exists (
    select 1
    from public.mars_pixel_reservations
    limit 1
  ) then
    raise exception 'MARS_PIXEL_V10_ABORT_RESERVATIONS_EXIST'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_purchase_intents
    limit 1
  ) then
    raise exception 'MARS_PIXEL_V10_ABORT_PURCHASE_INTENTS_EXIST'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations
    where allocation_status = 'owned'
    limit 1
  ) then
    raise exception 'MARS_PIXEL_V10_ABORT_OWNED_ALLOCATIONS_EXIST'
      using errcode = '55000';
  end if;
end;
$$;

do $$
declare
  v_ares public.mars_pixel_reserved_zones%rowtype;
begin
  select *
  into v_ares
  from public.mars_pixel_reserved_zones
  where zone_code = 'ARES_PROTECTED'
  for update;

  if not found then
    raise exception 'MARS_PIXEL_V10_ABORT_ARES_ZONE_MISSING'
      using errcode = '55000';
  end if;

  if v_ares.x_start <> 500
     or v_ares.y_start <> 350
     or v_ares.width <> 50
     or v_ares.height <> 50
     or v_ares.permanent is not true
     or v_ares.active is not true then
    raise exception 'MARS_PIXEL_V10_ABORT_ARES_ZONE_UNEXPECTED'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.allocation_status = 'owned'
      and allocation.x_start < 530
      and allocation.x_start + allocation.width > 520
      and allocation.y_start < 380
      and allocation.y_start + allocation.height > 370
  ) then
    raise exception 'MARS_PIXEL_V10_ABORT_ARES_TARGET_OVERLAP'
      using errcode = '55000';
  end if;

  update public.mars_pixel_reserved_zones
  set
    x_start = 520,
    y_start = 370,
    width = 10,
    height = 10,
    zone_name = 'Ares Sector',
    reservation_type = 'protected',
    permanent = true,
    active = true,
    updated_at = now()
  where zone_code = 'ARES_PROTECTED';

  if not found then
    raise exception 'MARS_PIXEL_V10_ABORT_ARES_UPDATE_FAILED'
      using errcode = '55000';
  end if;
end;
$$;


do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint as c
    where c.conrelid = 'public.mars_pixel_reservations'::regclass
      and c.contype = 'c'
  loop
    execute format(
      'alter table public.mars_pixel_reservations drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public.mars_pixel_reservations
  add constraint mars_pixel_reservations_grid_version_positive_v10
    check (grid_version > 0),
  add constraint mars_pixel_reservations_x_bounds_v10
    check (x_start >= 0 and x_start < 1000),
  add constraint mars_pixel_reservations_y_bounds_v10
    check (y_start >= 0 and y_start < 1000),
  add constraint mars_pixel_reservations_width_positive_v10
    check (width > 0),
  add constraint mars_pixel_reservations_height_positive_v10
    check (height > 0),
  add constraint mars_pixel_reservations_x_extent_v10
    check (x_start + width <= 1000),
  add constraint mars_pixel_reservations_y_extent_v10
    check (y_start + height <= 1000),
  add constraint mars_pixel_reservations_pixel_count_v10
    check (pixel_count = width * height),
  add constraint mars_pixel_reservations_minimum_pixels_v10
    check (pixel_count >= 50),
  add constraint mars_pixel_reservations_pixel_native_geometry_v10
    check (
      block_x_start = x_start
      and block_y_start = y_start
      and block_x_end = x_start + width - 1
      and block_y_end = y_start + height - 1
      and block_count = pixel_count
    ),
  add constraint mars_pixel_reservations_expiry_v10
    check (expires_at > created_at);

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint as c
    where c.conrelid = 'public.mars_pixel_purchase_intents'::regclass
      and c.contype = 'c'
  loop
    execute format(
      'alter table public.mars_pixel_purchase_intents drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public.mars_pixel_purchase_intents
  add constraint mars_pixel_purchase_intents_x_bounds_v10
    check (x_start >= 0 and x_start < 1000),
  add constraint mars_pixel_purchase_intents_y_bounds_v10
    check (y_start >= 0 and y_start < 1000),
  add constraint mars_pixel_purchase_intents_width_positive_v10
    check (width > 0),
  add constraint mars_pixel_purchase_intents_height_positive_v10
    check (height > 0),
  add constraint mars_pixel_purchase_intents_x_extent_v10
    check (x_start + width <= 1000),
  add constraint mars_pixel_purchase_intents_y_extent_v10
    check (y_start + height <= 1000),
  add constraint mars_pixel_purchase_intents_pixel_count_v10
    check (pixel_count = width * height),
  add constraint mars_pixel_purchase_intents_minimum_pixels_v10
    check (pixel_count >= 50),
  add constraint mars_pixel_purchase_intents_pixel_native_count_v10
    check (block_count = pixel_count);

alter table public.mars_pixel_pricing_config
  add column if not exists reference_currency_code text,
  add column if not exists price_per_pixel_minor bigint,
  add column if not exists minimum_purchase_pixels integer;

alter table public.mars_pixel_pricing_config
  add constraint mars_pixel_pricing_reference_currency_v10
    check (
      reference_currency_code is null
      or reference_currency_code = 'USD'
    ),
  add constraint mars_pixel_pricing_per_pixel_minor_v10
    check (
      price_per_pixel_minor is null
      or price_per_pixel_minor > 0
    ),
  add constraint mars_pixel_pricing_minimum_pixels_v10
    check (
      minimum_purchase_pixels is null
      or minimum_purchase_pixels >= 1
    );

update public.mars_pixel_pricing_config
set
  reference_currency_code = 'USD',
  price_per_pixel_minor = 100,
  minimum_purchase_pixels = 50,
  updated_at = now()
where id = 1
  and pricing_status = 'unconfigured';

comment on column public.mars_pixel_pricing_config.reference_currency_code is
'Reference valuation currency for Mars Pixels. This is not itself an enabled settlement rail.';

comment on column public.mars_pixel_pricing_config.price_per_pixel_minor is
'Reference value per single Mars Pixel in the reference currency minor unit. USD 100 means USD 1.00.';

comment on column public.mars_pixel_pricing_config.minimum_purchase_pixels is
'Minimum number of individual Mars Pixels required for a commercial reservation or purchase.';


drop function if exists public.get_mars_pixel_block_at_coordinate(
  integer,
  integer
);

create or replace function public.get_mars_pixel_block_at_coordinate(
  p_x integer,
  p_y integer
)
returns table (
  block_x integer,
  block_y integer,
  x_start integer,
  y_start integer,
  x_end integer,
  y_end integer,
  width integer,
  height integer,
  pixel_count integer,
  grid_version integer,
  block_status text,
  purchasable boolean,
  reserved_zone_code text,
  reserved_zone_name text,
  allocation_id uuid,
  advertiser_name text,
  creative_title text,
  creative_image_url text,
  destination_url text
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

  if p_x is null
     or p_y is null
     or p_x < 0
     or p_y < 0
     or p_x >= v_grid_width
     or p_y >= v_grid_height then
    raise exception 'MARS_PIXEL_COORDINATE_OUTSIDE_GRID'
      using errcode = '22023';
  end if;

  return query
  with owned as (
    select
      allocation.id as allocation_id,
      advertiser.display_name as advertiser_name,
      creative.title as creative_title,
      creative.image_url as creative_image_url,
      creative.destination_url as destination_url
    from public.mars_pixel_allocations as allocation
    join public.mars_advertisers as advertiser
      on advertiser.id = allocation.advertiser_id
    left join lateral (
      select
        c.title,
        c.image_url,
        c.destination_url
      from public.mars_pixel_creatives as c
      where c.allocation_id = allocation.id
      order by c.created_at desc
      limit 1
    ) as creative on true
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and p_x >= allocation.x_start
      and p_x < allocation.x_start + allocation.width
      and p_y >= allocation.y_start
      and p_y < allocation.y_start + allocation.height
    limit 1
  ),
  reserved as (
    select
      zone.zone_code,
      zone.zone_name
    from public.mars_pixel_reserved_zones as zone
    where zone.active = true
      and p_x >= zone.x_start
      and p_x < zone.x_start + zone.width
      and p_y >= zone.y_start
      and p_y < zone.y_start + zone.height
    order by
      zone.permanent desc,
      zone.created_at asc
    limit 1
  )
  select
    p_x,
    p_y,
    p_x,
    p_y,
    p_x,
    p_y,
    1,
    1,
    1,
    v_grid_version,
    case
      when reserved.zone_code is not null then 'reserved'
      when owned.allocation_id is not null then 'owned'
      else 'available'
    end,
    (
      reserved.zone_code is null
      and owned.allocation_id is null
      and v_commercial_status = 'active'
    ),
    reserved.zone_code,
    reserved.zone_name,
    owned.allocation_id,
    owned.advertiser_name,
    owned.creative_title,
    owned.creative_image_url,
    owned.destination_url
  from (select 1) as seed
  left join owned on true
  left join reserved on true;
end;
$$;

revoke all
on function public.get_mars_pixel_block_at_coordinate(
  integer,
  integer
)
from public;

grant execute
on function public.get_mars_pixel_block_at_coordinate(
  integer,
  integer
)
to anon, authenticated, service_role;

comment on function public.get_mars_pixel_block_at_coordinate(
  integer,
  integer
) is
'Pixel-native Mars Pixel detail lookup. One canonical coordinate equals exactly one Mars Pixel.';

drop function if exists public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
);

create or replace function public.get_mars_pixel_selection_detail(
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
  purchasable boolean,
  reserved_overlap_count bigint,
  owned_overlap_count bigint,
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

  v_x_start integer;
  v_y_start integer;
  v_x_end integer;
  v_y_end integer;
  v_width integer;
  v_height integer;
  v_pixel_count integer;

  v_reserved_overlap_count bigint;
  v_owned_overlap_count bigint;
  v_reserved_zone_code text;
  v_reserved_zone_name text;
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

  v_x_start := least(p_anchor_x, p_target_x);
  v_y_start := least(p_anchor_y, p_target_y);
  v_x_end := greatest(p_anchor_x, p_target_x);
  v_y_end := greatest(p_anchor_y, p_target_y);

  v_width := v_x_end - v_x_start + 1;
  v_height := v_y_end - v_y_start + 1;
  v_pixel_count := v_width * v_height;

  select count(*)
  into v_reserved_overlap_count
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_end + 1
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_end + 1
    and zone.y_start + zone.height > v_y_start;

  select
    zone.zone_code,
    zone.zone_name
  into
    v_reserved_zone_code,
    v_reserved_zone_name
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_end + 1
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_end + 1
    and zone.y_start + zone.height > v_y_start
  order by
    zone.permanent desc,
    zone.y_start,
    zone.x_start,
    zone.zone_code
  limit 1;

  select count(*)
  into v_owned_overlap_count
  from public.mars_pixel_allocations as allocation
  where allocation.grid_version = v_grid_version
    and allocation.allocation_status = 'owned'
    and allocation.x_start < v_x_end + 1
    and allocation.x_start + allocation.width > v_x_start
    and allocation.y_start < v_y_end + 1
    and allocation.y_start + allocation.height > v_y_start;

  return query
  select
    v_x_start,
    v_y_start,
    v_x_end,
    v_y_end,
    v_x_start,
    v_y_start,
    v_x_end,
    v_y_end,
    v_width,
    v_height,
    v_width,
    v_height,
    v_pixel_count,
    v_pixel_count,
    v_grid_version,
    case
      when v_reserved_overlap_count > 0 then 'reserved'
      when v_owned_overlap_count > 0 then 'owned'
      else 'available'
    end,
    (
      v_pixel_count >= 50
      and v_reserved_overlap_count = 0
      and v_owned_overlap_count = 0
      and v_commercial_status = 'active'
    ),
    v_reserved_overlap_count,
    v_owned_overlap_count,
    v_reserved_zone_code,
    v_reserved_zone_name;
end;
$$;

revoke all
on function public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
)
from public;

grant execute
on function public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
)
to anon, authenticated, service_role;

comment on function public.get_mars_pixel_selection_detail(
  integer,
  integer,
  integer,
  integer
) is
'Read-only server-authoritative Mars Pixel selection validation. One canonical grid coordinate equals one Mars Pixel. Minimum commercial purchase is 50 pixels.';



create or replace function public.get_mars_pixel_selection_valuation_v1(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer
)
returns table (
  pixel_count integer,
  standard_pixel_count integer,
  polar_pixel_count integer,
  reference_currency_code text,
  standard_price_per_pixel_minor bigint,
  polar_price_per_pixel_minor bigint,
  total_reference_value_minor bigint,
  minimum_purchase_pixels integer
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_grid_width integer;
  v_grid_height integer;

  v_x_start integer;
  v_y_start integer;
  v_x_end integer;
  v_y_end integer;
  v_width integer;
  v_height integer;

  v_pixel_count integer;
  v_standard_rows integer := 0;
  v_polar_rows integer := 0;
  v_standard_pixels integer;
  v_polar_pixels integer;

  v_reference_currency text;
  v_standard_price bigint;
  v_minimum_pixels integer;

  v_polar_price constant bigint := 50;
begin
  select
    config.grid_width,
    config.grid_height
  into
    v_grid_width,
    v_grid_height
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
     or p_target_x >= v_grid_width
     or p_anchor_y >= v_grid_height
     or p_target_y >= v_grid_height then
    raise exception 'MARS_PIXEL_SELECTION_OUTSIDE_GRID'
      using errcode = '22023';
  end if;

  select
    pricing.reference_currency_code,
    pricing.price_per_pixel_minor,
    pricing.minimum_purchase_pixels
  into
    v_reference_currency,
    v_standard_price,
    v_minimum_pixels
  from public.mars_pixel_pricing_config as pricing
  where pricing.id = 1;

  if not found
     or v_reference_currency <> 'USD'
     or v_standard_price is null
     or v_standard_price <= 0
     or v_minimum_pixels is null
     or v_minimum_pixels <= 0 then
    raise exception 'MARS_PIXEL_REFERENCE_PRICING_UNCONFIGURED'
      using errcode = '55000';
  end if;

  v_x_start := least(p_anchor_x, p_target_x);
  v_y_start := least(p_anchor_y, p_target_y);
  v_x_end := greatest(p_anchor_x, p_target_x);
  v_y_end := greatest(p_anchor_y, p_target_y);

  v_width := v_x_end - v_x_start + 1;
  v_height := v_y_end - v_y_start + 1;
  v_pixel_count := v_width * v_height;

  if v_y_start <= 99 then
    v_polar_rows :=
      v_polar_rows
      + greatest(0, least(v_y_end, 99) - v_y_start + 1);
  end if;

  if v_y_end >= 900 then
    v_polar_rows :=
      v_polar_rows
      + greatest(0, v_y_end - greatest(v_y_start, 900) + 1);
  end if;

  if v_y_end >= 100 and v_y_start <= 899 then
    v_standard_rows :=
      greatest(0, least(v_y_end, 899) - greatest(v_y_start, 100) + 1);
  end if;

  v_polar_pixels := v_width * v_polar_rows;
  v_standard_pixels := v_width * v_standard_rows;

  if v_polar_pixels + v_standard_pixels <> v_pixel_count then
    raise exception 'MARS_PIXEL_VALUATION_PIXEL_COUNT_MISMATCH'
      using errcode = '55000';
  end if;

  return query
  select
    v_pixel_count,
    v_standard_pixels,
    v_polar_pixels,
    v_reference_currency,
    v_standard_price,
    v_polar_price,
    (v_standard_pixels::bigint * v_standard_price)
      + (v_polar_pixels::bigint * v_polar_price),
    v_minimum_pixels;
end;
$$;

revoke all
on function public.get_mars_pixel_selection_valuation_v1(
  integer,
  integer,
  integer,
  integer
)
from public;

grant execute
on function public.get_mars_pixel_selection_valuation_v1(
  integer,
  integer,
  integer,
  integer
)
to anon, authenticated, service_role;

comment on function public.get_mars_pixel_selection_valuation_v1(
  integer,
  integer,
  integer,
  integer
) is
'Server-authoritative Mars Pixel reference valuation. Y 0-99 and Y 900-999 are polar zones valued at USD 0.50 per pixel. Y 100-899 is the standard zone valued at USD 1.00 per pixel. Mixed selections are valued pixel by pixel by fixed canonical Y coordinates.';

create or replace function public.reserve_mars_pixel_selection_v2(
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

  if v_commercial_status <> 'active' then
    raise exception 'MARS_PIXEL_COMMERCIAL_NETWORK_LOCKED'
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
on function public.reserve_mars_pixel_selection_v2(
  integer,
  integer,
  integer,
  integer
)
from public, anon;

grant execute
on function public.reserve_mars_pixel_selection_v2(
  integer,
  integer,
  integer,
  integer
)
to authenticated;

comment on function public.reserve_mars_pixel_selection_v2(
  integer,
  integer,
  integer,
  integer
) is
'Pixel-native Mars reservation foundation. One coordinate equals one Mars Pixel. Minimum reservation is 50 pixels. Commercial network lock remains server authoritative.';

commit;

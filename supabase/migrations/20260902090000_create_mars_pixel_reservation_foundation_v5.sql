begin;

create table public.mars_pixel_reservations (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete restrict,

  grid_version integer not null,

  x_start integer not null,
  y_start integer not null,
  width integer not null,
  height integer not null,

  block_x_start integer not null,
  block_y_start integer not null,
  block_x_end integer not null,
  block_y_end integer not null,

  block_count integer not null,
  pixel_count integer not null,

  status text not null default 'active'
    check (
      status in (
        'active',
        'expired',
        'cancelled',
        'converted'
      )
    ),

  expires_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (grid_version > 0),

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

  check (block_x_start >= 0),
  check (block_y_start >= 0),
  check (block_x_end >= block_x_start),
  check (block_y_end >= block_y_start),

  check (
    block_count =
      (block_x_end - block_x_start + 1) *
      (block_y_end - block_y_start + 1)
  ),

  check (pixel_count = width * height),

  check (x_start = block_x_start * 10),
  check (y_start = block_y_start * 10),
  check (width = (block_x_end - block_x_start + 1) * 10),
  check (height = (block_y_end - block_y_start + 1) * 10),

  check (expires_at > created_at)
);

create index mars_pixel_reservations_builder_idx
  on public.mars_pixel_reservations (
    builder_id,
    status,
    expires_at
  );

create index mars_pixel_reservations_grid_idx
  on public.mars_pixel_reservations (
    grid_version,
    status,
    x_start,
    y_start
  );

alter table public.mars_pixel_reservations
  enable row level security;

revoke all
  on table public.mars_pixel_reservations
  from public, anon, authenticated;

create or replace function public.reserve_mars_pixel_selection_v1(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer
)
returns table (
  reservation_id uuid,
  reservation_status text,
  expires_at timestamptz,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  block_count integer,
  pixel_count integer,
  grid_version integer
)
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
  v_width integer;
  v_height integer;
  v_block_count integer;
  v_pixel_count integer;

  v_reservation_id uuid;
  v_expires_at timestamptz;

  v_reserved_overlap_count bigint;
  v_owned_overlap_count bigint;
  v_reservation_overlap_count bigint;
begin
  if v_builder_id is null then
    raise exception 'Authentication required'
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
    raise exception
      'Mars Pixel Network configuration does not exist.';
  end if;

  if v_commercial_status <> 'active' then
    raise exception 'MARS_PIXEL_COMMERCIAL_LOCKED'
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

  v_x_start :=
    v_block_x_start * v_block_size;

  v_y_start :=
    v_block_y_start * v_block_size;

  v_width :=
    (v_block_x_end - v_block_x_start + 1) *
    v_block_size;

  v_height :=
    (v_block_y_end - v_block_y_start + 1) *
    v_block_size;

  v_block_count :=
    (v_block_x_end - v_block_x_start + 1) *
    (v_block_y_end - v_block_y_start + 1);

  v_pixel_count :=
    v_width * v_height;

  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_reservation_v1')
  );

  update public.mars_pixel_reservations
  set
    status = 'expired',
    updated_at = now()
  where status = 'active'
    and expires_at <= now();

  select count(*)
  into v_reserved_overlap_count
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start < v_x_start + v_width
    and zone.x_start + zone.width > v_x_start
    and zone.y_start < v_y_start + v_height
    and zone.y_start + zone.height > v_y_start;

  if v_reserved_overlap_count > 0 then
    raise exception 'MARS_PIXEL_RESERVED_ZONE'
      using errcode = '55000';
  end if;

  select count(*)
  into v_owned_overlap_count
  from public.mars_pixel_allocations as allocation
  where allocation.grid_version = v_grid_version
    and allocation.allocation_status = 'owned'
    and allocation.x_start < v_x_start + v_width
    and allocation.x_start + allocation.width > v_x_start
    and allocation.y_start < v_y_start + v_height
    and allocation.y_start + allocation.height > v_y_start;

  if v_owned_overlap_count > 0 then
    raise exception 'MARS_PIXEL_ALREADY_OWNED'
      using errcode = '55000';
  end if;

  select count(*)
  into v_reservation_overlap_count
  from public.mars_pixel_reservations as reservation
  where reservation.grid_version = v_grid_version
    and reservation.status = 'active'
    and reservation.expires_at > now()
    and reservation.x_start < v_x_start + v_width
    and reservation.x_start + reservation.width > v_x_start
    and reservation.y_start < v_y_start + v_height
    and reservation.y_start + reservation.height > v_y_start;

  if v_reservation_overlap_count > 0 then
    raise exception 'MARS_PIXEL_ALREADY_RESERVED'
      using errcode = '55000';
  end if;

  v_expires_at := now() + interval '15 minutes';

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
    v_block_x_start,
    v_block_y_start,
    v_block_x_end,
    v_block_y_end,
    v_block_count,
    v_pixel_count,
    'active',
    v_expires_at
  )
  returning id
  into v_reservation_id;

  return query
  select
    v_reservation_id,
    'active'::text,
    v_expires_at,
    v_x_start,
    v_y_start,
    v_width,
    v_height,
    v_block_count,
    v_pixel_count,
    v_grid_version;
end;
$$;

revoke all
on function public.reserve_mars_pixel_selection_v1(
  integer,
  integer,
  integer,
  integer
)
from public, anon;

grant execute
on function public.reserve_mars_pixel_selection_v1(
  integer,
  integer,
  integer,
  integer
)
to authenticated;

comment on table public.mars_pixel_reservations is
'Temporary server-authoritative Mars Pixel Network reservations. Reservations do not represent ownership or payment.';

comment on function public.reserve_mars_pixel_selection_v1(
  integer,
  integer,
  integer,
  integer
) is
'Creates a temporary canonical Mars Pixel Network reservation only when commercial access is active. Server validates authentication, canonical bounds, protected zones, ownership conflicts and active reservation conflicts. No payment, checkout or ownership conversion capability.';

commit;

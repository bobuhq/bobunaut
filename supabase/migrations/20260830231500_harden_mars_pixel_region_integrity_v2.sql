begin;

create or replace function public.mars_pixel_regions_overlap(
  p_left_x integer,
  p_left_y integer,
  p_left_width integer,
  p_left_height integer,
  p_right_x integer,
  p_right_y integer,
  p_right_width integer,
  p_right_height integer
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select
    p_left_x < p_right_x + p_right_width
    and p_left_x + p_left_width > p_right_x
    and p_left_y < p_right_y + p_right_height
    and p_left_y + p_left_height > p_right_y;
$$;

revoke all on function public.mars_pixel_regions_overlap(
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) from public, anon, authenticated;

create or replace function public.enforce_mars_pixel_reserved_zone_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.active then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    1297040469,
    1
  );

  if exists (
    select 1
    from public.mars_pixel_reserved_zones as zone
    where zone.active
      and zone.id <> new.id
      and public.mars_pixel_regions_overlap(
        new.x_start,
        new.y_start,
        new.width,
        new.height,
        zone.x_start,
        zone.y_start,
        zone.width,
        zone.height
      )
  ) then
    raise exception
      using
        errcode = '23P01',
        message = 'Mars Pixel reserved zone overlaps an existing active reserved zone.';
  end if;

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.allocation_status = 'owned'
      and allocation.grid_version = 1
      and public.mars_pixel_regions_overlap(
        new.x_start,
        new.y_start,
        new.width,
        new.height,
        allocation.x_start,
        allocation.y_start,
        allocation.width,
        allocation.height
      )
  ) then
    raise exception
      using
        errcode = '23P01',
        message = 'Mars Pixel reserved zone overlaps an owned allocation.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_mars_pixel_allocation_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.allocation_status <> 'owned' then
    return new;
  end if;

  if new.grid_version <> 1 then
    raise exception
      using
        errcode = '22023',
        message = 'Unsupported Mars Pixel grid version.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    1297040469,
    1
  );

  if exists (
    select 1
    from public.mars_pixel_allocations as allocation
    where allocation.allocation_status = 'owned'
      and allocation.grid_version = new.grid_version
      and allocation.id <> new.id
      and public.mars_pixel_regions_overlap(
        new.x_start,
        new.y_start,
        new.width,
        new.height,
        allocation.x_start,
        allocation.y_start,
        allocation.width,
        allocation.height
      )
  ) then
    raise exception
      using
        errcode = '23P01',
        message = 'Mars Pixel allocation overlaps an existing owned allocation.';
  end if;

  if exists (
    select 1
    from public.mars_pixel_reserved_zones as zone
    where zone.active
      and public.mars_pixel_regions_overlap(
        new.x_start,
        new.y_start,
        new.width,
        new.height,
        zone.x_start,
        zone.y_start,
        zone.width,
        zone.height
      )
  ) then
    raise exception
      using
        errcode = '23P01',
        message = 'Mars Pixel allocation overlaps an active reserved zone.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_mars_pixel_reserved_zone_integrity()
from public, anon, authenticated;

revoke all on function public.enforce_mars_pixel_allocation_integrity()
from public, anon, authenticated;

drop trigger if exists
  mars_pixel_reserved_zone_integrity_trigger
on public.mars_pixel_reserved_zones;

create trigger
  mars_pixel_reserved_zone_integrity_trigger
before insert or update of
  x_start,
  y_start,
  width,
  height,
  active
on public.mars_pixel_reserved_zones
for each row
execute function public.enforce_mars_pixel_reserved_zone_integrity();

drop trigger if exists
  mars_pixel_allocation_integrity_trigger
on public.mars_pixel_allocations;

create trigger
  mars_pixel_allocation_integrity_trigger
before insert or update of
  x_start,
  y_start,
  width,
  height,
  grid_version,
  allocation_status
on public.mars_pixel_allocations
for each row
execute function public.enforce_mars_pixel_allocation_integrity();

create index if not exists
  mars_pixel_reserved_zones_active_bounds_idx
on public.mars_pixel_reserved_zones (
  x_start,
  y_start,
  width,
  height
)
where active;

create index if not exists
  mars_pixel_allocations_owned_bounds_idx
on public.mars_pixel_allocations (
  grid_version,
  x_start,
  y_start,
  width,
  height
)
where allocation_status = 'owned';

comment on function public.mars_pixel_regions_overlap(
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) is
'Canonical rectangle overlap predicate for Mars Pixel Network regions.';

comment on function public.enforce_mars_pixel_reserved_zone_integrity() is
'Serializes Mars Pixel region writes and prevents active reserved zones from overlapping protected regions or owned allocations.';

comment on function public.enforce_mars_pixel_allocation_integrity() is
'Serializes Mars Pixel ownership writes and prevents owned allocations from overlapping another owned allocation or active reserved zone.';

commit;

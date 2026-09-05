begin;

create or replace function public.get_my_mars_pixel_test_access_v1()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users as admin_user
    join auth.users as auth_user
      on auth_user.id = admin_user.user_id
    where admin_user.user_id = auth.uid()
      and admin_user.active = true
      and admin_user.role in ('owner', 'admin')
      and lower(coalesce(auth_user.email, '')) =
        'bobuuniverse@gmail.com'
  );
$$;

revoke all
on function public.get_my_mars_pixel_test_access_v1()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_pixel_test_access_v1()
to authenticated;

create or replace function public.execute_mars_pixel_admin_test_purchase_v1(
  p_anchor_x integer,
  p_anchor_y integer,
  p_target_x integer,
  p_target_y integer,
  p_requested_color_key text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_original_commercial_status text;
  v_advertiser_id uuid;
  v_reservation jsonb;
  v_purchase jsonb;
  v_allocation jsonb;
  v_reservation_id uuid;
  v_purchase_intent_id uuid;
begin
  if v_builder_id is null then
    raise exception 'MARS_PIXEL_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not public.get_my_mars_pixel_test_access_v1() then
    raise exception 'MARS_PIXEL_COMMERCIAL_LOCKED'
      using errcode = '42501';
  end if;

  if p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) < 8
     or char_length(trim(p_idempotency_key)) > 160 then
    raise exception 'INVALID_IDEMPOTENCY_KEY'
      using errcode = '22023';
  end if;

  select advertiser.id
  into v_advertiser_id
  from public.mars_advertisers as advertiser
  where advertiser.owner_builder_id = v_builder_id
    and advertiser.status in ('under_review', 'active')
  order by advertiser.created_at asc
  limit 1;

  if v_advertiser_id is null then
    raise exception 'MARS_PIXEL_ADVERTISER_REQUIRED'
      using errcode = '55000';
  end if;

  select config.commercial_status
  into v_original_commercial_status
  from public.mars_pixel_network_config as config
  where config.id = 1
  for update;

  if not found then
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  if v_original_commercial_status <> 'active' then
    update public.mars_pixel_network_config
    set commercial_status = 'active'
    where id = 1;
  end if;

  select to_jsonb(reservation_row)
  into v_reservation
  from public.reserve_mars_pixel_selection_v1(
    p_anchor_x,
    p_anchor_y,
    p_target_x,
    p_target_y
  ) as reservation_row
  limit 1;

  if v_reservation is null then
    raise exception 'MARS_PIXEL_RESERVATION_FAILED'
      using errcode = '55000';
  end if;

  v_reservation_id :=
    (v_reservation ->> 'reservation_id')::uuid;

  select to_jsonb(purchase_row)
  into v_purchase
  from public.prepare_mars_pixel_purchase_v1(
    v_builder_id,
    v_reservation_id,
    trim(p_idempotency_key)
  ) as purchase_row
  limit 1;

  if v_purchase is null then
    raise exception 'MARS_PIXEL_PURCHASE_PREPARATION_FAILED'
      using errcode = '55000';
  end if;

  v_purchase_intent_id :=
    (v_purchase ->> 'purchase_intent_id')::uuid;

  select to_jsonb(allocation_row)
  into v_allocation
  from public.commit_mars_pixel_gp_purchase_v1(
    v_purchase_intent_id,
    v_advertiser_id,
    p_requested_color_key
  ) as allocation_row
  limit 1;

  if v_allocation is null then
    raise exception 'MARS_PIXEL_PURCHASE_COMMIT_FAILED'
      using errcode = '55000';
  end if;

  if v_original_commercial_status <> 'active' then
    update public.mars_pixel_network_config
    set commercial_status = v_original_commercial_status
    where id = 1;
  end if;

  return jsonb_build_object(
    'success', true,
    'testAccess', true,
    'reservation', v_reservation,
    'purchase', v_purchase,
    'allocation', v_allocation
  );
end;
$$;

revoke all
on function public.execute_mars_pixel_admin_test_purchase_v1(
  integer,
  integer,
  integer,
  integer,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.execute_mars_pixel_admin_test_purchase_v1(
  integer,
  integer,
  integer,
  integer,
  text,
  text
)
to authenticated;

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
  v_test_access boolean := false;
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
    raise exception 'Mars Pixel Network configuration does not exist.';
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

  if auth.uid() is not null then
    v_test_access :=
      public.get_my_mars_pixel_test_access_v1();
  end if;

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
      and (
        v_commercial_status = 'active'
        or v_test_access = true
      )
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

commit;

begin;

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
  v_original_activated_at timestamptz;
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

  select config.commercial_status, config.activated_at
  into v_original_commercial_status, v_original_activated_at
  from public.mars_pixel_network_config as config
  where config.id = 1
  for update;

  if not found then
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  if v_original_commercial_status <> 'active' then
    update public.mars_pixel_network_config
    set
      commercial_status = 'active',
      activated_at = coalesce(activated_at, now())
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
    set
      commercial_status = v_original_commercial_status,
      activated_at = v_original_activated_at
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

commit;

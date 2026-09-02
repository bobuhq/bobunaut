begin;

create or replace function public.commit_mars_pixel_gp_purchase_v1(
  p_purchase_intent_id uuid,
  p_advertiser_id uuid
)
returns table (
  purchase_intent_id uuid,
  purchase_status text,
  allocation_id uuid,
  gp_ledger_id uuid,
  total_price bigint,
  personal_gp_spent bigint,
  eligible_network_gp_spent bigint,
  remaining_personal_gp bigint,
  remaining_eligible_network_gp bigint,
  remaining_total_gp bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grid_version integer;
  v_commercial_status text;

  v_pricing_status text;
  v_currency_code text;
  v_price_per_block bigint;

  v_purchase public.mars_pixel_purchase_intents%rowtype;
  v_reservation public.mars_pixel_reservations%rowtype;
  v_advertiser public.mars_advertisers%rowtype;

  v_personal_gp bigint;
  v_eligible_network_gp bigint;

  v_personal_gp_spent bigint;
  v_eligible_network_gp_spent bigint;

  v_remaining_personal_gp bigint;
  v_remaining_eligible_network_gp bigint;
  v_remaining_total_gp bigint;

  v_reserved_overlap_count bigint;
  v_owned_overlap_count bigint;
  v_other_reservation_overlap_count bigint;

  v_expected_total_price bigint;

  v_ledger_id uuid;

  v_allocation_id uuid;
  v_existing_allocation public.mars_pixel_allocations%rowtype;

  v_ledger_idempotency_key text;
begin
  if p_purchase_intent_id is null then
    raise exception 'PURCHASE_INTENT_ID_REQUIRED'
      using errcode = '22004';
  end if;

  if p_advertiser_id is null then
    raise exception 'ADVERTISER_ID_REQUIRED'
      using errcode = '22004';
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

  if v_currency_code <> 'GP' then
    raise exception 'MARS_PIXEL_GP_PRICING_REQUIRED'
      using errcode = '55000';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('mars_pixel_reservation_v1')::bigint
  );

  select *
  into v_purchase
  from public.mars_pixel_purchase_intents as purchase
  where purchase.id = p_purchase_intent_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_PURCHASE_INTENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_purchase.status = 'committed' then
    select *
    into v_existing_allocation
    from public.mars_pixel_allocations as allocation
    where allocation.id = v_purchase.allocation_id;

    if not found then
      raise exception 'MARS_PIXEL_COMMITTED_ALLOCATION_MISSING'
        using errcode = '55000';
    end if;

    if v_existing_allocation.advertiser_id <> p_advertiser_id then
      raise exception 'MARS_PIXEL_ADVERTISER_MISMATCH'
        using errcode = '23505';
    end if;

    select
      profile.personal_gp,
      profile.eligible_network_gp,
      profile.gp
    into
      v_remaining_personal_gp,
      v_remaining_eligible_network_gp,
      v_remaining_total_gp
    from public.builder_profiles as profile
    where profile.builder_id = v_purchase.builder_id;

    select
      coalesce(
        (ledger.metadata ->> 'personal_gp_spent')::bigint,
        0
      ),
      coalesce(
        (ledger.metadata ->> 'eligible_network_gp_spent')::bigint,
        0
      )
    into
      v_personal_gp_spent,
      v_eligible_network_gp_spent
    from public.builder_reward_ledger as ledger
    where ledger.id = v_purchase.gp_ledger_id;

    return query
    select
      v_purchase.id,
      v_purchase.status,
      v_purchase.allocation_id,
      v_purchase.gp_ledger_id,
      v_purchase.total_price,
      coalesce(v_personal_gp_spent, 0),
      coalesce(v_eligible_network_gp_spent, 0),
      coalesce(v_remaining_personal_gp, 0),
      coalesce(v_remaining_eligible_network_gp, 0),
      coalesce(v_remaining_total_gp, 0);

    return;
  end if;

  if v_purchase.status <> 'prepared' then
    raise exception 'MARS_PIXEL_PURCHASE_NOT_PREPARED'
      using errcode = '55000';
  end if;

  if v_purchase.grid_version <> v_grid_version then
    raise exception 'MARS_PIXEL_GRID_VERSION_MISMATCH'
      using errcode = '55000';
  end if;

  if v_purchase.currency_code <> v_currency_code
     or v_purchase.price_per_block <> v_price_per_block then
    raise exception 'MARS_PIXEL_PRICE_CHANGED'
      using errcode = '55000';
  end if;

  if v_purchase.block_count > 0
     and v_price_per_block >
       (
         9223372036854775807::bigint /
         v_purchase.block_count::bigint
       ) then
    raise exception 'MARS_PIXEL_PRICE_OVERFLOW'
      using errcode = '22003';
  end if;

  v_expected_total_price :=
    v_price_per_block *
    v_purchase.block_count::bigint;

  if v_purchase.total_price <> v_expected_total_price then
    raise exception 'MARS_PIXEL_PRICE_CHANGED'
      using errcode = '55000';
  end if;

  select *
  into v_reservation
  from public.mars_pixel_reservations as reservation
  where reservation.id = v_purchase.reservation_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_RESERVATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_reservation.builder_id <> v_purchase.builder_id then
    raise exception 'MARS_PIXEL_RESERVATION_OWNER_MISMATCH'
      using errcode = '42501';
  end if;

  if v_reservation.grid_version <> v_purchase.grid_version then
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

  if v_reservation.x_start <> v_purchase.x_start
     or v_reservation.y_start <> v_purchase.y_start
     or v_reservation.width <> v_purchase.width
     or v_reservation.height <> v_purchase.height
     or v_reservation.block_count <> v_purchase.block_count
     or v_reservation.pixel_count <> v_purchase.pixel_count then
    raise exception 'MARS_PIXEL_PURCHASE_GEOMETRY_MISMATCH'
      using errcode = '55000';
  end if;

  select count(*)
  into v_reserved_overlap_count
  from public.mars_pixel_reserved_zones as zone
  where zone.active = true
    and zone.x_start <
      v_purchase.x_start + v_purchase.width
    and zone.x_start + zone.width >
      v_purchase.x_start
    and zone.y_start <
      v_purchase.y_start + v_purchase.height
    and zone.y_start + zone.height >
      v_purchase.y_start;

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
      v_purchase.x_start + v_purchase.width
    and allocation.x_start + allocation.width >
      v_purchase.x_start
    and allocation.y_start <
      v_purchase.y_start + v_purchase.height
    and allocation.y_start + allocation.height >
      v_purchase.y_start;

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
      v_purchase.x_start + v_purchase.width
    and reservation.x_start + reservation.width >
      v_purchase.x_start
    and reservation.y_start <
      v_purchase.y_start + v_purchase.height
    and reservation.y_start + reservation.height >
      v_purchase.y_start;

  if v_other_reservation_overlap_count > 0 then
    raise exception 'MARS_PIXEL_ALREADY_RESERVED'
      using errcode = '55000';
  end if;

  select *
  into v_advertiser
  from public.mars_advertisers as advertiser
  where advertiser.id = p_advertiser_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_advertiser.owner_builder_id is null
     or v_advertiser.owner_builder_id <> v_purchase.builder_id then
    raise exception 'MARS_PIXEL_ADVERTISER_OWNER_MISMATCH'
      using errcode = '42501';
  end if;

  if v_advertiser.status not in ('under_review', 'active') then
    raise exception 'MARS_PIXEL_ADVERTISER_NOT_ELIGIBLE'
      using errcode = '55000';
  end if;

  select
    coalesce(profile.personal_gp, 0),
    coalesce(profile.eligible_network_gp, 0)
  into
    v_personal_gp,
    v_eligible_network_gp
  from public.builder_profiles as profile
  where profile.builder_id = v_purchase.builder_id
  for update;

  if not found then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = 'P0002';
  end if;

  if v_personal_gp + v_eligible_network_gp <
     v_purchase.total_price then
    raise exception 'INSUFFICIENT_GP'
      using errcode = '22003';
  end if;

  v_personal_gp_spent :=
    least(
      v_personal_gp,
      v_purchase.total_price
    );

  v_eligible_network_gp_spent :=
    v_purchase.total_price -
    v_personal_gp_spent;

  v_remaining_personal_gp :=
    v_personal_gp -
    v_personal_gp_spent;

  v_remaining_eligible_network_gp :=
    v_eligible_network_gp -
    v_eligible_network_gp_spent;

  v_remaining_total_gp :=
    v_remaining_personal_gp +
    v_remaining_eligible_network_gp;

  v_ledger_idempotency_key :=
    'mars-pixel-purchase:' ||
    v_purchase.id::text;

  if exists (
    select 1
    from public.builder_reward_ledger as ledger
    where ledger.builder_id = v_purchase.builder_id
      and ledger.idempotency_key =
        v_ledger_idempotency_key
  ) then
    raise exception 'MARS_PIXEL_GP_LEDGER_CONFLICT'
      using errcode = '23505';
  end if;

  insert into public.builder_reward_ledger (
    builder_id,
    reward_type,
    provider,
    amount,
    entry_type,
    idempotency_key,
    metadata
  )
  values (
    v_purchase.builder_id,
    'mars_pixel_purchase',
    'mars_pixel',
    v_purchase.total_price,
    'debit',
    v_ledger_idempotency_key,
    jsonb_build_object(
      'purchase_intent_id',
      v_purchase.id,
      'reservation_id',
      v_reservation.id,
      'advertiser_id',
      p_advertiser_id,
      'grid_version',
      v_grid_version,
      'currency_code',
      v_purchase.currency_code,
      'price_per_block',
      v_purchase.price_per_block,
      'block_count',
      v_purchase.block_count,
      'pixel_count',
      v_purchase.pixel_count,
      'personal_gp_spent',
      v_personal_gp_spent,
      'eligible_network_gp_spent',
      v_eligible_network_gp_spent
    )
  )
  returning id
  into v_ledger_id;

  update public.builder_profiles as profile
  set
    personal_gp =
      v_remaining_personal_gp,
    eligible_network_gp =
      v_remaining_eligible_network_gp,
    gp =
      v_remaining_total_gp
  where profile.builder_id =
    v_purchase.builder_id;

  if not found then
    raise exception 'BUILDER_GP_DEBIT_FAILED'
      using errcode = '55000';
  end if;

  insert into public.mars_pixel_allocations (
    advertiser_id,
    allocation_status,
    x_start,
    y_start,
    width,
    height,
    grid_version,
    activated_at
  )
  values (
    p_advertiser_id,
    'owned',
    v_purchase.x_start,
    v_purchase.y_start,
    v_purchase.width,
    v_purchase.height,
    v_grid_version,
    now()
  )
  returning id
  into v_allocation_id;

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_allocation_id,
    'created',
    v_purchase.builder_id,
    jsonb_build_object(
      'purchase_intent_id',
      v_purchase.id,
      'reservation_id',
      v_reservation.id,
      'currency_code',
      v_purchase.currency_code,
      'total_price',
      v_purchase.total_price
    )
  );

  insert into public.mars_pixel_allocation_events (
    allocation_id,
    event_type,
    actor_user_id,
    event_data
  )
  values (
    v_allocation_id,
    'activated',
    v_purchase.builder_id,
    jsonb_build_object(
      'purchase_intent_id',
      v_purchase.id,
      'reservation_id',
      v_reservation.id
    )
  );

  update public.mars_pixel_reservations as reservation
  set
    status = 'converted',
    updated_at = now()
  where reservation.id = v_reservation.id
    and reservation.status = 'active';

  if not found then
    raise exception 'MARS_PIXEL_RESERVATION_CONVERSION_FAILED'
      using errcode = '55000';
  end if;

  update public.mars_pixel_purchase_intents as purchase
  set
    status = 'committed',
    allocation_id = v_allocation_id,
    gp_ledger_id = v_ledger_id,
    committed_at = now(),
    updated_at = now()
  where purchase.id = v_purchase.id
    and purchase.status = 'prepared';

  if not found then
    raise exception 'MARS_PIXEL_PURCHASE_COMMIT_FAILED'
      using errcode = '55000';
  end if;

  return query
  select
    v_purchase.id,
    'committed'::text,
    v_allocation_id,
    v_ledger_id,
    v_purchase.total_price,
    v_personal_gp_spent,
    v_eligible_network_gp_spent,
    v_remaining_personal_gp,
    v_remaining_eligible_network_gp,
    v_remaining_total_gp;
end;
$$;

revoke all
on function public.commit_mars_pixel_gp_purchase_v1(
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.commit_mars_pixel_gp_purchase_v1(
  uuid,
  uuid
)
to service_role;

comment on function public.commit_mars_pixel_gp_purchase_v1(
  uuid,
  uuid
) is
'Service-role-only atomic Mars Pixel GP purchase commit. Revalidates commercial state, GP pricing, purchase intent, reservation, protected zones, ownership, advertiser ownership and Builder balance. Atomically writes immutable GP debit, owned allocation, allocation events, reservation conversion and purchase commitment. Pending Network GP is never spendable.';

commit;

-- ============================================================
-- BOBU MARS PIXEL — SOLANA VERIFICATION CONTEXT V29
--
-- Narrow service-role-only read contract for the Solana
-- verifier Edge Function.
--
-- The verifier must never trust buyer wallet, treasury,
-- amount, memo/reference, network, payment state or advertiser
-- identity supplied by the browser.
-- ============================================================

drop function if exists
  public.get_mars_pixel_solana_verification_context_v1(uuid, uuid);

create function public.get_mars_pixel_solana_verification_context_v1(
  p_payment_order_id uuid,
  p_builder_id uuid
)
returns table (
  payment_order_id uuid,
  builder_id uuid,
  reservation_id uuid,
  payment_status text,
  buyer_wallet text,
  treasury_address text,
  amount_lamports bigint,
  payment_reference text,
  network text,
  expires_at timestamptz,
  transaction_signature text,
  transaction_slot bigint,
  transaction_block_time timestamptz,
  advertiser_id uuid,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_payment_order_id is null then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_REQUIRED'
      using errcode = '22023';
  end if;

  if p_builder_id is null then
    raise exception 'BUILDER_ID_REQUIRED'
      using errcode = '22023';
  end if;

  return query
  select
    sol_order.id,
    sol_order.builder_id,
    sol_order.reservation_id,
    sol_order.payment_status,
    sol_order.buyer_wallet,
    sol_order.treasury_address,
    sol_order.amount_lamports,
    sol_order.payment_reference,
    sol_order.network,
    sol_order.expires_at,
    sol_order.transaction_signature,
    sol_order.transaction_slot,
    sol_order.transaction_block_time,
    advertiser.id,
    sol_order.verified_at
  from public.mars_pixel_solana_payment_orders as sol_order
  left join lateral (
    select mars_advertiser.id
    from public.mars_advertisers as mars_advertiser
    where mars_advertiser.owner_builder_id = sol_order.builder_id
      and mars_advertiser.status in ('under_review', 'active')
    order by mars_advertiser.created_at asc
    limit 1
  ) as advertiser
    on true
  where sol_order.id = p_payment_order_id
    and sol_order.builder_id = p_builder_id;

  if not found then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_NOT_FOUND'
      using errcode = 'P0002';
  end if;
end
$$;

revoke all
on function public.get_mars_pixel_solana_verification_context_v1(
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.get_mars_pixel_solana_verification_context_v1(
  uuid,
  uuid
)
to service_role;

comment on function
  public.get_mars_pixel_solana_verification_context_v1(
    uuid,
    uuid
  )
is
  'Service-role-only verifier context for one Mars Pixel SOL payment order owned by the supplied authenticated builder. Returns authoritative payment facts and trusted advertiser identity without exposing underlying tables to browser or service-role direct SELECT.';

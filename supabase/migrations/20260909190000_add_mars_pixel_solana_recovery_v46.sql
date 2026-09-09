-- ============================================================
-- BOBU MARS PIXEL — SOLANA PAYMENT RECOVERY V46
-- Authenticated, Devnet-only automatic payment recovery.
-- ============================================================

begin;

create or replace function public.get_my_mars_pixel_solana_recovery_v1(
  p_buyer_wallet text
)
returns table (
  payment_order_id uuid,
  payment_status text,
  reservation_id uuid,
  buyer_wallet text,
  network text,
  transaction_signature text,
  x_start integer,
  y_start integer,
  width integer,
  height integer,
  pixel_count integer,
  expires_at timestamptz,
  idempotency_key text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_wallet text := trim(p_buyer_wallet);
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if v_wallet is null
     or char_length(v_wallet) not between 32 and 44 then
    raise exception 'INVALID_SOLANA_BUYER_WALLET'
      using errcode = '22023';
  end if;

  if public.get_my_mars_pixel_test_access_v1() is not true then
    raise exception 'MARS_PIXEL_DEVNET_LOCKED'
      using errcode = '42501';
  end if;

  return query
  select
    sol_order.id,
    sol_order.payment_status,
    sol_order.reservation_id,
    sol_order.buyer_wallet,
    sol_order.network,
    sol_order.transaction_signature,
    sol_order.x_start,
    sol_order.y_start,
    sol_order.width,
    sol_order.height,
    sol_order.pixel_count,
    sol_order.expires_at,
    sol_order.idempotency_key
  from public.mars_pixel_solana_payment_orders as sol_order
  where sol_order.builder_id = v_builder_id
    and sol_order.buyer_wallet = v_wallet
    and sol_order.network = 'devnet'
    and sol_order.transaction_signature is not null
    and sol_order.payment_status in (
      'awaiting_payment',
      'detected',
      'verifying',
      'expired'
    )
  order by
    sol_order.created_at desc,
    sol_order.id desc
  limit 1;
end
$$;

revoke all
on function public.get_my_mars_pixel_solana_recovery_v1(text)
from public, anon, authenticated;

grant execute
on function public.get_my_mars_pixel_solana_recovery_v1(text)
to authenticated;

comment on function
  public.get_my_mars_pixel_solana_recovery_v1(text)
is
  'Authenticated Devnet-only recovery lookup for the callers latest broadcast but unsettled Mars Pixel SOL payment. Does not verify payment or create ownership.';

commit;

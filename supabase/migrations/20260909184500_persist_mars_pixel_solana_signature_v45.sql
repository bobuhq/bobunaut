-- ============================================================
-- BOBU MARS PIXEL — SOLANA SIGNATURE RECOVERY V45
--
-- Persist a broadcast Devnet transaction signature immediately
-- so a browser refresh / reconnect / transient verification
-- failure can never cause a second SOL transfer.
--
-- IMPORTANT:
-- This function does NOT verify blockchain payment facts,
-- create ownership, activate an allocation, or enable Mainnet.
-- Final settlement remains exclusively in
-- commit_mars_pixel_solana_payment_v2 after independent
-- blockchain verification.
-- ============================================================

begin;

create or replace function public.record_mars_pixel_solana_signature_v1(
  p_payment_order_id uuid,
  p_transaction_signature text
)
returns table (
  payment_order_id uuid,
  payment_status text,
  transaction_signature text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.mars_pixel_solana_payment_orders%rowtype;
  v_signature text := trim(p_transaction_signature);
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED'
      using errcode = '42501';
  end if;

  if p_payment_order_id is null then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_REQUIRED'
      using errcode = '22023';
  end if;

  if v_signature is null
     or char_length(v_signature) < 32
     or char_length(v_signature) > 128
     or v_signature !~ '^[1-9A-HJ-NP-Za-km-z]+$' then
    raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_SIGNATURE_INVALID'
      using errcode = '22023';
  end if;

  select *
  into v_order
  from public.mars_pixel_solana_payment_orders
  where id = p_payment_order_id
  for update;

  if not found then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_order.builder_id <> v_user_id then
    raise exception 'MARS_PIXEL_SOLANA_PAYMENT_ORDER_OWNER_MISMATCH'
      using errcode = '42501';
  end if;

  if v_order.network <> 'devnet' then
    raise exception 'MARS_PIXEL_SOLANA_DEVNET_ONLY'
      using errcode = '55000';
  end if;

  if v_order.payment_status not in (
    'awaiting_payment',
    'detected',
    'verifying',
    'expired',
    'verified',
    'refund_required'
  ) then
    raise exception 'MARS_PIXEL_SOLANA_SIGNATURE_NOT_RECORDABLE'
      using errcode = '55000';
  end if;

  -- Once a signature exists it is immutable for this order.
  if v_order.transaction_signature is not null then
    if v_order.transaction_signature <> v_signature then
      raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_CONFLICT'
        using errcode = '23505';
    end if;

    return query
    select
      v_order.id,
      v_order.payment_status,
      v_order.transaction_signature;

    return;
  end if;

  -- Defense in depth in addition to the table UNIQUE constraint.
  if exists (
    select 1
    from public.mars_pixel_solana_payment_orders as other_order
    where other_order.transaction_signature = v_signature
      and other_order.id <> v_order.id
  ) then
    raise exception 'MARS_PIXEL_SOLANA_TRANSACTION_ALREADY_USED'
      using errcode = '23505';
  end if;

  update public.mars_pixel_solana_payment_orders
  set
    transaction_signature = v_signature,
    detected_at = coalesce(detected_at, now()),
    updated_at = now()
  where id = v_order.id;

  return query
  select
    v_order.id,
    v_order.payment_status,
    v_signature;
end;
$$;

revoke all
on function public.record_mars_pixel_solana_signature_v1(uuid, text)
from public, anon, authenticated;

grant execute
on function public.record_mars_pixel_solana_signature_v1(uuid, text)
to authenticated;

comment on function public.record_mars_pixel_solana_signature_v1(uuid, text) is
'Persists an authenticated Builder-owned Devnet Solana transaction signature for crash-safe payment recovery. Does not verify payment or create Mars Pixel ownership.';

commit;

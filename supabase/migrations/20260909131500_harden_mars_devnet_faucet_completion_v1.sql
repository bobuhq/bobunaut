begin;

alter table public.mars_devnet_faucet_requests
  alter column amount_lamports
  set default 1610000000;

create or replace function public.reserve_mars_devnet_faucet_v1(
  p_builder_id uuid,
  p_wallet_address text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_wallet text := trim(coalesce(p_wallet_address, ''));
  v_request_id uuid;
  v_global_count integer := 0;
begin
  if p_builder_id is null then
    raise exception 'INVALID_BUILDER';
  end if;

  -- Faucet requires a real registered Supabase user.
  if not exists (
    select 1
    from auth.users
    where id = p_builder_id
  ) then
    raise exception 'REGISTERED_USER_REQUIRED';
  end if;

  if (
    char_length(v_wallet) < 32
    or char_length(v_wallet) > 44
    or v_wallet !~ '^[1-9A-HJ-NP-Za-km-z]+$'
  ) then
    raise exception 'INVALID_SOLANA_WALLET';
  end if;

  -- Lock order is always global -> builder -> wallet.
  perform pg_advisory_xact_lock(
    hashtextextended('mars_devnet_faucet:global', 0)
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'mars_devnet_faucet:builder:' || p_builder_id::text,
      0
    )
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'mars_devnet_faucet:wallet:' || v_wallet,
      0
    )
  );

  -- One faucet allocation per registered Builder, forever.
  if exists (
    select 1
    from public.mars_devnet_faucet_requests
    where builder_id = p_builder_id
      and status in ('pending', 'success')
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'builder_already_claimed',
      'retry_after_seconds', 0
    );
  end if;

  -- One faucet allocation per Solana wallet, forever.
  if exists (
    select 1
    from public.mars_devnet_faucet_requests
    where wallet_address = v_wallet
      and status in ('pending', 'success')
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'wallet_already_claimed',
      'retry_after_seconds', 0
    );
  end if;

  -- Operational safety cap: maximum 20 active/successful faucet
  -- allocations during a rolling 24-hour period.
  select count(*)
  into v_global_count
  from public.mars_devnet_faucet_requests
  where status in ('pending', 'success')
    and created_at >= now() - interval '24 hours';

  if v_global_count >= 20 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_faucet_limit',
      'retry_after_seconds', 3600
    );
  end if;

  insert into public.mars_devnet_faucet_requests (
    builder_id,
    wallet_address,
    amount_lamports,
    network,
    status
  )
  values (
    p_builder_id,
    v_wallet,
    1610000000,
    'devnet',
    'pending'
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'request_id', v_request_id,
    'amount_lamports', 1610000000,
    'network', 'devnet',
    'retry_after_seconds', 0
  );
end;
$function$;

revoke all
on function public.reserve_mars_devnet_faucet_v1(uuid, text)
from public, anon, authenticated;

grant execute
on function public.reserve_mars_devnet_faucet_v1(uuid, text)
to service_role;

comment on function public.reserve_mars_devnet_faucet_v1(uuid, text) is
'Reserves one lifetime 1.61 SOL Devnet faucet allocation per registered Builder and per Solana wallet, with a global daily safety cap.';

commit;

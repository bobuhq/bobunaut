begin;

-- ============================================================
-- BOBU MARS DEVNET FAUCET V1 HARDENING
-- Prevent concurrent requests from bypassing Builder, wallet,
-- or global daily limits.
-- ============================================================

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

  v_builder_last timestamptz;
  v_wallet_last timestamptz;

  v_global_count integer := 0;
  v_retry_after_seconds integer := 0;
begin
  if p_builder_id is null then
    raise exception 'INVALID_BUILDER';
  end if;

  if (
    char_length(v_wallet) < 32
    or char_length(v_wallet) > 44
    or v_wallet !~ '^[1-9A-HJ-NP-Za-km-z]+$'
  ) then
    raise exception 'INVALID_SOLANA_WALLET';
  end if;

  -- Serialize all faucet reservations globally first so the
  -- global daily cap cannot be exceeded by concurrent requests.
  perform pg_advisory_xact_lock(
    hashtextextended('mars_devnet_faucet:global', 0)
  );

  -- Independently serialize this Builder across ALL wallets.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'mars_devnet_faucet:builder:' || p_builder_id::text,
      0
    )
  );

  -- Independently serialize this wallet across ALL Builders.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'mars_devnet_faucet:wallet:' || v_wallet,
      0
    )
  );

  -- Close abandoned reservations.
  update public.mars_devnet_faucet_requests
  set
    status = 'failed',
    error_code = 'reservation_timeout',
    completed_at = now()
  where status = 'pending'
    and created_at < now() - interval '5 minutes';

  select max(created_at)
  into v_builder_last
  from public.mars_devnet_faucet_requests
  where builder_id = p_builder_id
    and status in ('pending', 'success')
    and created_at >= now() - interval '24 hours';

  if v_builder_last is not null then
    v_retry_after_seconds :=
      greatest(
        1,
        ceil(
          extract(
            epoch from (
              v_builder_last
              + interval '24 hours'
              - now()
            )
          )
        )::integer
      );

    return jsonb_build_object(
      'allowed', false,
      'reason', 'builder_cooldown',
      'retry_after_seconds', v_retry_after_seconds
    );
  end if;

  select max(created_at)
  into v_wallet_last
  from public.mars_devnet_faucet_requests
  where wallet_address = v_wallet
    and status in ('pending', 'success')
    and created_at >= now() - interval '24 hours';

  if v_wallet_last is not null then
    v_retry_after_seconds :=
      greatest(
        1,
        ceil(
          extract(
            epoch from (
              v_wallet_last
              + interval '24 hours'
              - now()
            )
          )
        )::integer
      );

    return jsonb_build_object(
      'allowed', false,
      'reason', 'wallet_cooldown',
      'retry_after_seconds', v_retry_after_seconds
    );
  end if;

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


commit;

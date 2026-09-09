begin;

-- ============================================================
-- BOBU MARS DEVNET FAUCET V1
-- DEVNET ONLY
-- - Authenticated Builder required by Edge Function.
-- - 0.5 Devnet SOL per successful request.
-- - 24h cooldown per Builder.
-- - 24h cooldown per wallet.
-- - Atomic reservation prevents concurrent abuse.
-- - No browser access to operational records.
-- ============================================================

create table if not exists public.mars_devnet_faucet_requests (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete cascade,

  wallet_address text not null,

  amount_lamports bigint not null default 500000000
    check (amount_lamports = 500000000),

  network text not null default 'devnet'
    check (network = 'devnet'),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'success',
        'failed'
      )
    ),

  transaction_signature text,

  error_code text,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists
  mars_devnet_faucet_builder_created_idx
on public.mars_devnet_faucet_requests(
  builder_id,
  created_at desc
);

create index if not exists
  mars_devnet_faucet_wallet_created_idx
on public.mars_devnet_faucet_requests(
  wallet_address,
  created_at desc
);

create index if not exists
  mars_devnet_faucet_status_created_idx
on public.mars_devnet_faucet_requests(
  status,
  created_at desc
);

alter table public.mars_devnet_faucet_requests
enable row level security;

revoke all
on table public.mars_devnet_faucet_requests
from public, anon, authenticated;


-- ============================================================
-- RESERVE FAUCET REQUEST
-- Service-role only.
--
-- Limits:
-- - one successful/pending claim per Builder per 24h
-- - one successful/pending claim per wallet per 24h
-- - maximum 20 successful/pending faucet requests globally / 24h
-- - abandoned pending reservations expire after 5 minutes
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

  -- Serialize requests for this Builder and wallet.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_builder_id::text || ':' || v_wallet,
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
    500000000,
    'devnet',
    'pending'
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'request_id', v_request_id,
    'amount_lamports', 500000000,
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


-- ============================================================
-- COMPLETE FAUCET REQUEST
-- Service-role only.
-- ============================================================

create or replace function public.complete_mars_devnet_faucet_v1(
  p_request_id uuid,
  p_success boolean,
  p_transaction_signature text default null,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_updated integer;
begin
  update public.mars_devnet_faucet_requests
  set
    status =
      case
        when p_success then 'success'
        else 'failed'
      end,

    transaction_signature =
      case
        when p_success
          then nullif(trim(coalesce(p_transaction_signature, '')), '')
        else null
      end,

    error_code =
      case
        when p_success
          then null
        else left(
          nullif(trim(coalesce(p_error_code, '')), ''),
          160
        )
      end,

    completed_at = now()

  where id = p_request_id
    and status = 'pending';

  get diagnostics v_updated = row_count;

  return v_updated = 1;
end;
$function$;

revoke all
on function public.complete_mars_devnet_faucet_v1(
  uuid,
  boolean,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.complete_mars_devnet_faucet_v1(
  uuid,
  boolean,
  text,
  text
)
to service_role;


comment on table public.mars_devnet_faucet_requests is
'Server-only operational ledger for the BOBU Mars Solana Devnet faucet.';

comment on function public.reserve_mars_devnet_faucet_v1(uuid, text) is
'Atomically reserves a 0.5 SOL Devnet faucet request with Builder, wallet and global cooldown protection.';

comment on function public.complete_mars_devnet_faucet_v1(uuid, boolean, text, text) is
'Finalizes a reserved BOBU Mars Devnet faucet request after the server-side Solana transfer attempt.';

commit;

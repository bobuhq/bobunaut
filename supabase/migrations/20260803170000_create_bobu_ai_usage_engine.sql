begin;

-- ============================================================
-- BOBU AI PRODUCTION USAGE ENGINE
-- - No conversation content is stored.
-- - Atomic per-Builder rate limiting.
-- - Concurrent request protection.
-- - Token, latency and outcome telemetry.
-- ============================================================

create table if not exists public.builder_ai_usage (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null
    references auth.users(id)
    on delete cascade,

  model text not null,
  language text not null default 'en',
  pathname text not null default '/',

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'success',
        'openai_error',
        'timeout',
        'empty_response',
        'internal_error'
      )
    ),

  input_tokens integer
    check (input_tokens is null or input_tokens >= 0),

  output_tokens integer
    check (output_tokens is null or output_tokens >= 0),

  total_tokens integer
    check (total_tokens is null or total_tokens >= 0),

  latency_ms integer
    check (latency_ms is null or latency_ms >= 0),

  error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists
  idx_builder_ai_usage_builder_created
on public.builder_ai_usage(
  builder_id,
  created_at desc
);

create index if not exists
  idx_builder_ai_usage_created
on public.builder_ai_usage(created_at desc);

create index if not exists
  idx_builder_ai_usage_status_created
on public.builder_ai_usage(
  status,
  created_at desc
);

alter table public.builder_ai_usage
enable row level security;

-- No direct browser access.
revoke all
on table public.builder_ai_usage
from public, anon, authenticated;

-- ============================================================
-- RESERVE REQUEST
-- Atomically checks:
--   6 requests per rolling minute
--   100 requests per rolling 24 hours
--   maximum 2 pending requests in the last 30 seconds
-- ============================================================

create or replace function public.reserve_my_bobu_ai_request(
  p_model text,
  p_language text default 'en',
  p_pathname text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();

  v_model text :=
    left(trim(coalesce(p_model, '')), 120);

  v_language text :=
    left(trim(coalesce(p_language, 'en')), 12);

  v_pathname text :=
    left(trim(coalesce(p_pathname, '/')), 120);

  v_minute_count integer;
  v_day_count integer;
  v_pending_count integer;

  v_request_id uuid;
  v_oldest_minute_request timestamptz;
  v_retry_after_seconds integer := 0;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required.';
  end if;

  if v_model = '' then
    raise exception 'AI model is required.';
  end if;

  -- Serialize reservations for this Builder.
  perform pg_advisory_xact_lock(
    hashtextextended(v_builder_id::text, 0)
  );

  -- Close abandoned pending requests so they do not remain
  -- permanently in-flight.
  update public.builder_ai_usage
  set
    status = 'timeout',
    error_code = 'abandoned_request',
    completed_at = now()
  where builder_id = v_builder_id
    and status = 'pending'
    and created_at < now() - interval '2 minutes';

  select count(*)
  into v_minute_count
  from public.builder_ai_usage
  where builder_id = v_builder_id
    and created_at >= now() - interval '1 minute';

  select count(*)
  into v_day_count
  from public.builder_ai_usage
  where builder_id = v_builder_id
    and created_at >= now() - interval '24 hours';

  select count(*)
  into v_pending_count
  from public.builder_ai_usage
  where builder_id = v_builder_id
    and status = 'pending'
    and created_at >= now() - interval '30 seconds';

  if v_pending_count >= 2 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'concurrent_limit',
      'retry_after_seconds', 10,
      'minute_remaining',
        greatest(0, 6 - v_minute_count),
      'day_remaining',
        greatest(0, 100 - v_day_count)
    );
  end if;

  if v_minute_count >= 6 then
    select min(created_at)
    into v_oldest_minute_request
    from public.builder_ai_usage
    where builder_id = v_builder_id
      and created_at >= now() - interval '1 minute';

    v_retry_after_seconds :=
      greatest(
        1,
        ceil(
          extract(
            epoch from (
              v_oldest_minute_request
              + interval '1 minute'
              - now()
            )
          )
        )::integer
      );

    return jsonb_build_object(
      'allowed', false,
      'reason', 'minute_limit',
      'retry_after_seconds', v_retry_after_seconds,
      'minute_remaining', 0,
      'day_remaining',
        greatest(0, 100 - v_day_count)
    );
  end if;

  if v_day_count >= 100 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'retry_after_seconds', 3600,
      'minute_remaining',
        greatest(0, 6 - v_minute_count),
      'day_remaining', 0
    );
  end if;

  insert into public.builder_ai_usage (
    builder_id,
    model,
    language,
    pathname,
    status
  )
  values (
    v_builder_id,
    v_model,
    case
      when v_language = '' then 'en'
      else v_language
    end,
    case
      when v_pathname = '' then '/'
      else v_pathname
    end,
    'pending'
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'request_id', v_request_id,
    'retry_after_seconds', 0,
    'minute_remaining',
      greatest(0, 5 - v_minute_count),
    'day_remaining',
      greatest(0, 99 - v_day_count)
  );
end;
$$;

-- ============================================================
-- FINALIZE REQUEST
-- The authenticated Builder may finalize only their own
-- reserved request through this SECURITY DEFINER RPC.
-- ============================================================

create or replace function public.finalize_my_bobu_ai_request(
  p_request_id uuid,
  p_status text,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_total_tokens integer default null,
  p_latency_ms integer default null,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_updated integer;
begin
  if v_builder_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_request_id is null then
    raise exception 'Request ID is required.';
  end if;

  if p_status not in (
    'success',
    'openai_error',
    'timeout',
    'empty_response',
    'internal_error'
  ) then
    raise exception 'Invalid AI request status.';
  end if;

  update public.builder_ai_usage
  set
    status = p_status,
    input_tokens =
      greatest(0, p_input_tokens),
    output_tokens =
      greatest(0, p_output_tokens),
    total_tokens =
      greatest(0, p_total_tokens),
    latency_ms =
      greatest(0, p_latency_ms),
    error_code =
      nullif(left(trim(coalesce(p_error_code, '')), 120), ''),
    completed_at = now()
  where id = p_request_id
    and builder_id = v_builder_id
    and status = 'pending';

  get diagnostics v_updated = row_count;

  return v_updated = 1;
end;
$$;

revoke all
on function public.reserve_my_bobu_ai_request(
  text,
  text,
  text
)
from public;

grant execute
on function public.reserve_my_bobu_ai_request(
  text,
  text,
  text
)
to authenticated;

revoke all
on function public.finalize_my_bobu_ai_request(
  uuid,
  text,
  integer,
  integer,
  integer,
  integer,
  text
)
from public;

grant execute
on function public.finalize_my_bobu_ai_request(
  uuid,
  text,
  integer,
  integer,
  integer,
  integer,
  text
)
to authenticated;

comment on table public.builder_ai_usage is
  'Stores BOBU AI request telemetry without storing conversation content.';

comment on function public.reserve_my_bobu_ai_request(
  text,
  text,
  text
) is
  'Atomically applies per-Builder BOBU AI rate and concurrency limits and reserves a telemetry record.';

comment on function public.finalize_my_bobu_ai_request(
  uuid,
  text,
  integer,
  integer,
  integer,
  integer,
  text
) is
  'Finalizes the authenticated Builder own BOBU AI telemetry record.';

commit;

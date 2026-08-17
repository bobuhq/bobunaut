begin;

-- ============================================================
-- BOBU UNIVERSE
-- Mining Abuse Security Counter v1
--
-- Purpose:
-- Detect repeated rejected mining actions without treating
-- ordinary single user mistakes as security incidents.
-- ============================================================

create table if not exists
public.mining_security_attempts (
  id uuid primary key default gen_random_uuid(),

  builder_id uuid not null,

  action text not null
    check (action in ('start', 'claim')),

  reason text not null,

  source_ip inet,

  created_at timestamptz not null default now()
);

create index if not exists
  mining_security_attempts_builder_action_reason_created_idx
on public.mining_security_attempts (
  builder_id,
  action,
  reason,
  created_at desc
);

create index if not exists
  mining_security_attempts_ip_created_idx
on public.mining_security_attempts (
  source_ip,
  created_at desc
)
where source_ip is not null;

alter table
  public.mining_security_attempts
enable row level security;

revoke all
on table public.mining_security_attempts
from public, anon, authenticated;

grant select, insert, delete
on table public.mining_security_attempts
to service_role;


create or replace function
public.record_mining_security_attempt(
  p_builder_id uuid,
  p_action text,
  p_reason text,
  p_source_ip inet default null,
  p_window_seconds integer default 300
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window interval;
  v_count integer;
begin
  if p_builder_id is null then
    raise exception 'INVALID_MINING_SECURITY_BUILDER';
  end if;

  if p_action not in ('start', 'claim') then
    raise exception 'INVALID_MINING_SECURITY_ACTION';
  end if;

  if (
    p_reason is null
    or char_length(trim(p_reason)) = 0
    or char_length(p_reason) > 120
  ) then
    raise exception 'INVALID_MINING_SECURITY_REASON';
  end if;

  /*
   * Serialize abuse-counter updates per Builder.
   * Concurrent requests cannot evade the threshold.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'mining-security:' ||
      p_builder_id::text,
      0
    )
  );

  v_window :=
    make_interval(
      secs => least(
        greatest(
          coalesce(p_window_seconds, 300),
          60
        ),
        3600
      )
    );

  insert into public.mining_security_attempts (
    builder_id,
    action,
    reason,
    source_ip
  )
  values (
    p_builder_id,
    p_action,
    trim(p_reason),
    p_source_ip
  );

  select count(*)
  into v_count
  from public.mining_security_attempts attempt
  where attempt.builder_id = p_builder_id
    and attempt.action = p_action
    and attempt.reason = trim(p_reason)
    and attempt.created_at >= now() - v_window;

  return v_count;
end;
$$;

revoke all
on function public.record_mining_security_attempt(
  uuid,
  text,
  text,
  inet,
  integer
)
from public, anon, authenticated;

grant execute
on function public.record_mining_security_attempt(
  uuid,
  text,
  text,
  inet,
  integer
)
to service_role;

comment on table
public.mining_security_attempts is
'Server-only history of repeated rejected mining actions used for abuse detection.';

comment on function
public.record_mining_security_attempt(
  uuid,
  text,
  text,
  inet,
  integer
) is
'Atomically records a rejected mining action and returns the Builder rejection count inside the configured security window.';

commit;

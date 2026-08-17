begin;

-- ============================================================
-- BOBU UNIVERSE
-- Admin Login Security / Brute Force Protection v1
-- ============================================================

create table if not exists
public.admin_login_security_attempts (
  id uuid primary key default gen_random_uuid(),

  source_ip inet not null,

  identifier_hash text not null
    check (
      char_length(identifier_hash) between 32 and 128
    ),

  success boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists
  admin_login_security_attempts_ip_created_idx
on public.admin_login_security_attempts(
  source_ip,
  created_at desc
);

create index if not exists
  admin_login_security_attempts_identifier_created_idx
on public.admin_login_security_attempts(
  identifier_hash,
  created_at desc
);

alter table
  public.admin_login_security_attempts
enable row level security;

revoke all
on table public.admin_login_security_attempts
from public, anon, authenticated;

-- Only trusted server-side service-role code
-- may use the attempt history.
grant select, insert, delete
on table public.admin_login_security_attempts
to service_role;

comment on table
public.admin_login_security_attempts is
'Server-side admin authentication attempt history used for brute-force detection. Raw administrator identifiers and passwords are never stored.';


-- ============================================================
-- ATOMIC LOGIN ATTEMPT RESERVATION
-- ============================================================

create or replace function
public.reserve_admin_login_attempt(
  p_source_ip inet,
  p_identifier_hash text,
  p_window_seconds integer default 300,
  p_block_threshold integer default 10
)
returns table (
  attempt_id uuid,
  failure_count integer,
  allowed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_attempt_id uuid;
  v_window interval;
  v_ip_count integer;
  v_identifier_count integer;
  v_failure_count integer;
begin
  if p_source_ip is null then
    raise exception 'INVALID_ADMIN_LOGIN_SOURCE_IP';
  end if;

  if (
    p_identifier_hash is null
    or char_length(p_identifier_hash) < 32
    or char_length(p_identifier_hash) > 128
  ) then
    raise exception 'INVALID_ADMIN_LOGIN_IDENTIFIER_HASH';
  end if;

  /*
   * Serialize concurrent attempts for the same
   * IP + administrator identifier combination.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_source_ip::text || ':' ||
      p_identifier_hash,
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

  insert into public.admin_login_security_attempts (
    source_ip,
    identifier_hash,
    success
  )
  values (
    p_source_ip,
    p_identifier_hash,
    false
  )
  returning id
  into v_attempt_id;

  select count(*)::integer
  into v_ip_count
  from public.admin_login_security_attempts
  where source_ip = p_source_ip
    and success = false
    and created_at >= now() - v_window;

  select count(*)::integer
  into v_identifier_count
  from public.admin_login_security_attempts
  where identifier_hash = p_identifier_hash
    and success = false
    and created_at >= now() - v_window;

  v_failure_count :=
    greatest(
      coalesce(v_ip_count, 0),
      coalesce(v_identifier_count, 0)
    );

  return query
  select
    v_attempt_id,
    v_failure_count,
    v_failure_count <
      least(
        greatest(
          coalesce(p_block_threshold, 10),
          2
        ),
        100
      );
end;
$function$;


revoke all
on function
public.reserve_admin_login_attempt(
  inet,
  text,
  integer,
  integer
)
from public, anon, authenticated;

grant execute
on function
public.reserve_admin_login_attempt(
  inet,
  text,
  integer,
  integer
)
to service_role;


create or replace function
public.mark_admin_login_attempt_success(
  p_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  update public.admin_login_security_attempts
  set success = true
  where id = p_attempt_id;
end;
$function$;

revoke all
on function
public.mark_admin_login_attempt_success(uuid)
from public, anon, authenticated;

grant execute
on function
public.mark_admin_login_attempt_success(uuid)
to service_role;

commit;

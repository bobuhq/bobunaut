begin;

-- ============================================================
-- BOBU UNIVERSE
-- Security Event Engine v1
-- ============================================================

create table if not exists public.bobu_security_events (
  id uuid primary key default gen_random_uuid(),

  event_type text not null
    check (
      char_length(trim(event_type)) between 1 and 120
    ),

  severity text not null
    check (
      severity in ('info', 'warning', 'critical')
    ),

  source text not null
    check (
      char_length(trim(source)) between 1 and 120
    ),

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  source_ip inet,

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now()
);

create index if not exists
  bobu_security_events_created_idx
on public.bobu_security_events(created_at desc);

create index if not exists
  bobu_security_events_type_idx
on public.bobu_security_events(event_type);

create index if not exists
  bobu_security_events_severity_idx
on public.bobu_security_events(severity);

create index if not exists
  bobu_security_events_actor_idx
on public.bobu_security_events(actor_user_id);

alter table public.bobu_security_events
enable row level security;

revoke all
on table public.bobu_security_events
from public, anon, authenticated;

-- ============================================================
-- IMMUTABLE SECURITY HISTORY
-- ============================================================

create or replace function
public.prevent_bobu_security_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  raise exception
    'bobu_security_events is immutable; update and delete operations are not allowed';
end;
$function$;

drop trigger if exists
  prevent_bobu_security_events_update
on public.bobu_security_events;

create trigger prevent_bobu_security_events_update
before update on public.bobu_security_events
for each row
execute function
  public.prevent_bobu_security_event_mutation();

drop trigger if exists
  prevent_bobu_security_events_delete
on public.bobu_security_events;

create trigger prevent_bobu_security_events_delete
before delete on public.bobu_security_events
for each row
execute function
  public.prevent_bobu_security_event_mutation();

comment on table public.bobu_security_events is
'Server-side immutable BOBU security event history.';


-- ============================================================
-- ATOMIC TELEGRAM ALERT COOLDOWN
-- Operational state only; security event history above
-- remains immutable.
-- ============================================================

create table if not exists
public.bobu_security_alert_cooldowns (
  fingerprint text primary key,

  last_alerted_at timestamptz
    not null default now()
);

alter table
public.bobu_security_alert_cooldowns
enable row level security;

revoke all
on table public.bobu_security_alert_cooldowns
from public, anon, authenticated;


create or replace function
public.reserve_bobu_security_alert(
  p_fingerprint text,
  p_cooldown_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_now timestamptz := now();
  v_cooldown interval;
  v_updated integer;
begin
  if (
    p_fingerprint is null
    or char_length(trim(p_fingerprint)) < 16
    or char_length(p_fingerprint) > 128
  ) then
    raise exception
      'INVALID_SECURITY_ALERT_FINGERPRINT';
  end if;

  v_cooldown :=
    make_interval(
      secs => least(
        greatest(
          coalesce(p_cooldown_seconds, 300),
          60
        ),
        3600
      )
    );

  update public.bobu_security_alert_cooldowns
  set last_alerted_at = v_now
  where fingerprint = p_fingerprint
    and last_alerted_at <=
      v_now - v_cooldown;

  get diagnostics
    v_updated = row_count;

  if v_updated = 1 then
    return true;
  end if;

  begin
    insert into
      public.bobu_security_alert_cooldowns (
        fingerprint,
        last_alerted_at
      )
    values (
      p_fingerprint,
      v_now
    );

    return true;

  exception
    when unique_violation then
      return false;
  end;
end;
$function$;

revoke all
on function
public.reserve_bobu_security_alert(
  text,
  integer
)
from public, anon, authenticated;

grant execute
on function
public.reserve_bobu_security_alert(
  text,
  integer
)
to service_role;

comment on function
public.reserve_bobu_security_alert(
  text,
  integer
)
is
'Atomically reserves a Telegram security alert cooldown slot.';

commit;

-- BOBU ARES Colony Voice V1
-- Durable membership revocation queue.
-- No cron, network requests or LiveKit calls.

begin;

create schema if not exists ares_voice_private;

revoke all on schema ares_voice_private
from public, anon, authenticated;

create table ares_voice_private.revocation_queue (
  id uuid primary key default gen_random_uuid(),

  membership_id uuid not null,
  colony_id uuid not null,
  builder_id uuid not null,

  room_name text not null,
  participant_identity text not null,

  reason text not null
    check (
      reason in (
        'membership_left',
        'membership_removed',
        'membership_deleted',
        'membership_changed'
      )
    ),

  attempts integer not null default 0
    check (attempts >= 0),

  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  processed_at timestamptz,
  last_error text,

  constraint revocation_room_identity_check
    check (
      room_name = 'ares-colony-' || colony_id::text
      and participant_identity = builder_id::text
    )
);

create index revocation_queue_pending_idx
on ares_voice_private.revocation_queue (
  next_attempt_at,
  created_at
)
where processed_at is null;

revoke all on ares_voice_private.revocation_queue
from public, anon, authenticated;

create or replace function
ares_voice_private.enqueue_membership_revocation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, ares_voice_private
as $$
declare
  v_reason text;
begin
  if old.status <> 'active' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'active'
       and new.colony_id is not distinct from old.colony_id
       and new.builder_id is not distinct from old.builder_id
    then
      return null;
    end if;

    v_reason := case
      when new.status = 'left' then 'membership_left'
      when new.status in ('removed', 'suspended')
        then 'membership_removed'
      else 'membership_changed'
    end;
  else
    v_reason := 'membership_deleted';
  end if;

  insert into ares_voice_private.revocation_queue (
    membership_id,
    colony_id,
    builder_id,
    room_name,
    participant_identity,
    reason
  )
  values (
    old.id,
    old.colony_id,
    old.builder_id,
    'ares-colony-' || old.colony_id::text,
    old.builder_id::text,
    v_reason
  );

  return null;
end;
$$;

revoke all on function
ares_voice_private.enqueue_membership_revocation()
from public, anon, authenticated;

create constraint trigger ares_voice_membership_updated
after update on public.mars_colony_memberships
deferrable initially deferred
for each row
execute function
ares_voice_private.enqueue_membership_revocation();

create constraint trigger ares_voice_membership_deleted
after delete on public.mars_colony_memberships
deferrable initially deferred
for each row
execute function
ares_voice_private.enqueue_membership_revocation();


-- ARES VOICE ATOMIC QUEUE CLAIM V1

alter table ares_voice_private.revocation_queue
  add column claim_token uuid,
  add column claimed_until timestamptz,
  add constraint revocation_claim_consistency
    check (
      (claim_token is null and claimed_until is null)
      or
      (claim_token is not null and claimed_until is not null)
    );

alter table ares_voice_private.revocation_queue
  enable row level security;

-- ARES VOICE GENERATION REGISTRY V1

lock table public.mars_colony_memberships
in share row exclusive mode;

create table ares_voice_private.membership_generations (
  membership_id uuid primary key,

  colony_id uuid not null,
  builder_id uuid not null,

  generation_id uuid not null
    default gen_random_uuid()
    unique,

  -- ARES VOICE AUTHORIZATION LEASE V1
  last_authorized_at timestamptz,

  created_at timestamptz not null
    default clock_timestamp()
);

alter table ares_voice_private.membership_generations
  enable row level security;

revoke all on
ares_voice_private.membership_generations
from public, anon, authenticated, service_role;

-- Initialize existing active memberships.

insert into ares_voice_private.membership_generations (
  membership_id,
  colony_id,
  builder_id
)
select
  m.id,
  m.colony_id,
  m.builder_id
from public.mars_colony_memberships m
where m.status = 'active';

-- Bind queued revocations to the original generation.

alter table ares_voice_private.revocation_queue
  add column generation_id uuid not null;

alter table ares_voice_private.revocation_queue
  drop constraint revocation_room_identity_check;

alter table ares_voice_private.revocation_queue
  add constraint revocation_room_identity_check
  check (
    room_name = 'ares-colony-' || colony_id::text
    and participant_identity =
      builder_id::text || ':' || generation_id::text
  );


create or replace function
public.ares_voice_claim_revocations_v1(
  p_limit integer default 10
)
returns table (
  queue_id uuid,
  claim_token uuid,
  colony_id uuid,
  builder_id uuid,
  generation_id uuid,
  room_name text,
  participant_identity text,
  attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  return query

  with candidates as (
    select q.id
    from ares_voice_private.revocation_queue q
    where q.processed_at is null
      and q.next_attempt_at <= now()
      and (
        q.claimed_until is null
        or q.claimed_until <= now()
      )
    order by q.next_attempt_at, q.created_at, q.id
    limit greatest(
      1, least(coalesce(p_limit, 10), 20)
    )
    for update of q skip locked
  ),
  claimed as (
    update ares_voice_private.revocation_queue q
    set
      claim_token = gen_random_uuid(),
      claimed_until = now() + interval '120 seconds',
      attempts = q.attempts + 1
    from candidates c
    where q.id = c.id
    returning
      q.id,
      q.claim_token,
      q.colony_id,
      q.builder_id,
      q.generation_id,
      q.room_name,
      q.participant_identity,
      q.attempts
  )
  select
    c.id,
    c.claim_token,
    c.colony_id,
    c.builder_id,
    c.generation_id,
    c.room_name,
    c.participant_identity,
    c.attempts
  from claimed c;
end;
$$;

revoke all on function
public.ares_voice_claim_revocations_v1(integer)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_claim_revocations_v1(integer)
to service_role;



-- ARES VOICE GENERATION AWARE WORKER V1

-- ARES VOICE REVOCATION LIFECYCLE V1

alter table ares_voice_private.revocation_queue
  add column result text,
  add constraint revocation_result_check
    check (
      result is null
      or result in (
        'participant_removed',
        'participant_not_found',
        'membership_reactivated'
      )
    );

-- Revalidate immediately before external processing.

create or replace function
public.ares_voice_revalidate_revocation_v1(
  p_queue_id uuid,
  p_claim_token uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job ares_voice_private.revocation_queue%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select q.*
  into v_job
  from ares_voice_private.revocation_queue q
  where q.id = p_queue_id
    and q.claim_token = p_claim_token
    and q.claimed_until > clock_timestamp()
    and q.processed_at is null;

  if not found then
    return 'CLAIM_INVALID';
  end if;

  if exists (
    select 1
    from ares_voice_private.membership_generations g
    join public.mars_colony_memberships m
      on m.id = g.membership_id
      and m.builder_id = g.builder_id
      and m.colony_id = g.colony_id
    join public.mars_colonies c
      on c.id = m.colony_id
    where g.generation_id = v_job.generation_id
      and g.membership_id = v_job.membership_id
      and g.builder_id = v_job.builder_id
      and g.colony_id = v_job.colony_id
      and m.status = 'active'
      and c.status = 'active'
  ) then
    return 'MEMBERSHIP_REACTIVATED';
  end if;

  return 'REVOCATION_REQUIRED';
end;
$$;

-- Complete only while the original claim remains valid.

create or replace function
public.ares_voice_complete_revocation_v1(
  p_queue_id uuid,
  p_claim_token uuid,
  p_result text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_result is null or p_result not in (
    'participant_removed',
    'participant_not_found',
    'membership_reactivated'
  ) then
    raise exception 'INVALID_REVOCATION_RESULT'
      using errcode = '22023';
  end if;

  if p_result = 'membership_reactivated'
     and public.ares_voice_revalidate_revocation_v1(
       p_queue_id,
       p_claim_token
     ) <> 'MEMBERSHIP_REACTIVATED'
  then
    return false;
  end if;

  update ares_voice_private.revocation_queue q
  set
    processed_at = clock_timestamp(),
    result = p_result,
    claim_token = null,
    claimed_until = null,
    last_error = null
  where q.id = p_queue_id
    and q.claim_token = p_claim_token
    and q.claimed_until > clock_timestamp()
    and q.processed_at is null;

  return found;
end;
$$;

-- Durable retry with bounded exponential backoff.

create or replace function
public.ares_voice_retry_revocation_v1(
  p_queue_id uuid,
  p_claim_token uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  update ares_voice_private.revocation_queue q
  set
    last_error = case
      when p_error_code in (
        'LIVEKIT_TIMEOUT',
        'LIVEKIT_UNAVAILABLE',
        'LIVEKIT_RATE_LIMIT',
        'LIVEKIT_REMOVE_FAILED',
        'MEMBERSHIP_CHECK_FAILED',
        'WORKER_INTERNAL_ERROR'
      )
      then p_error_code
      else 'WORKER_INTERNAL_ERROR'
    end,
    next_attempt_at =
      clock_timestamp() + make_interval(
        secs => least(
          900,
          5 * power(
            2,
            least(greatest(q.attempts - 1, 0), 8)
          )
        )::double precision
      ),
    claim_token = null,
    claimed_until = null
  where q.id = p_queue_id
    and q.claim_token = p_claim_token
    and q.claimed_until > clock_timestamp()
    and q.processed_at is null;

  return found;
end;
$$;

-- Explicit server-only execution permissions.

revoke all on function
public.ares_voice_revalidate_revocation_v1(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_revalidate_revocation_v1(uuid, uuid)
to service_role;

revoke all on function
public.ares_voice_complete_revocation_v1(uuid, uuid, text)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_complete_revocation_v1(uuid, uuid, text)
to service_role;

revoke all on function
public.ares_voice_retry_revocation_v1(uuid, uuid, text)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_retry_revocation_v1(uuid, uuid, text)
to service_role;



-- Replace only the new voice-specific trigger.
-- Existing Mars access enforcement is untouched.

create or replace function
ares_voice_private.enqueue_membership_revocation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_generation uuid;
  v_reason text;
begin

  -- ARES VOICE DEFERRED MUTATION LOCK V1
  -- Serialize voice-only writes at transaction completion.
  -- Never acquire a parent colony row lock here.

  perform pg_catalog.pg_advisory_xact_lock(
    415273, 26001
  );

  if tg_op = 'INSERT' then

    if new.status = 'active' then
      insert into ares_voice_private.membership_generations (
        membership_id,
        colony_id,
        builder_id
      )
      values (
        new.id,
        new.colony_id,
        new.builder_id
      );
    end if;

    return null;
  end if;

  if tg_op = 'UPDATE' then

    if old.status = 'active'
       and new.status = 'active'
       and new.id is not distinct from old.id
       and new.colony_id is not distinct from old.colony_id
       and new.builder_id is not distinct from old.builder_id
    then
      return null;
    end if;

  end if;

  if old.status = 'active' then

    delete from ares_voice_private.membership_generations g
    where g.membership_id = old.id
      and g.colony_id = old.colony_id
      and g.builder_id = old.builder_id
    returning g.generation_id
    into v_generation;

    if v_generation is null then
      raise exception 'VOICE_GENERATION_MISSING';
    end if;

    if tg_op = 'DELETE' then
      v_reason := 'membership_deleted';
    else
      v_reason := case
        when new.status = 'left'
          then 'membership_left'
        when new.status in ('removed', 'suspended')
          then 'membership_removed'
        else 'membership_changed'
      end;
    end if;

    insert into ares_voice_private.revocation_queue (
      membership_id,
      colony_id,
      builder_id,
      generation_id,
      room_name,
      participant_identity,
      reason
    )
    values (
      old.id,
      old.colony_id,
      old.builder_id,
      v_generation,
      'ares-colony-' || old.colony_id::text,
      old.builder_id::text || ':' || v_generation::text,
      v_reason
    );

  end if;

  if tg_op = 'UPDATE' then

    if new.status = 'active' then
      insert into ares_voice_private.membership_generations (
        membership_id,
        colony_id,
        builder_id
      )
      values (
        new.id,
        new.colony_id,
        new.builder_id
      );
    end if;

  end if;

  return null;
end;
$$;

revoke all on function
ares_voice_private.enqueue_membership_revocation()
from public, anon, authenticated, service_role;

create constraint trigger ares_voice_membership_inserted
after insert on public.mars_colony_memberships
deferrable initially deferred
for each row
execute function
ares_voice_private.enqueue_membership_revocation();




-- ARES VOICE LEASE EXPIRATION ENGINE V1

create or replace function
ares_voice_private.expire_generations(
  p_limit integer,
  p_builder_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_cutoff timestamptz;
begin

  perform pg_catalog.pg_advisory_xact_lock(
    415273, 26001
  );

  v_cutoff :=
    clock_timestamp() - interval '90 seconds';

  with expired as materialized (
    select
      g.membership_id,
      g.colony_id,
      g.builder_id,
      g.generation_id
    from ares_voice_private.membership_generations g
    where g.last_authorized_at is not null
      and g.last_authorized_at <= v_cutoff
      and (
        p_builder_id is null
        or g.builder_id = p_builder_id
      )
    order by
      g.last_authorized_at,
      g.membership_id
    limit greatest(
      1,
      least(coalesce(p_limit, 50), 100)
    )
    for update
  ),
  rotated as (
    update ares_voice_private.membership_generations g
    set
      generation_id = gen_random_uuid(),
      last_authorized_at = null,
      created_at = clock_timestamp()
    from expired e
    where g.membership_id = e.membership_id
      and g.generation_id = e.generation_id
    returning
      e.membership_id,
      e.colony_id,
      e.builder_id,
      e.generation_id
  )
  insert into ares_voice_private.revocation_queue (
    membership_id,
    colony_id,
    builder_id,
    generation_id,
    room_name,
    participant_identity,
    reason
  )
  select
    r.membership_id,
    r.colony_id,
    r.builder_id,
    r.generation_id,
    'ares-colony-' || r.colony_id::text,
    r.builder_id::text || ':' || r.generation_id::text,
    'voice_lease_expired'
  from rotated r;

  get diagnostics v_count = row_count;

  return v_count;

end;
$$;

revoke all on function
ares_voice_private.expire_generations(integer, uuid)
from public, anon, authenticated, service_role;


-- ARES VOICE SECURE TOKEN GENERATION V1

create or replace function
public.ares_voice_get_my_generation_v1()
returns table (
  colony_id uuid,
  builder_id uuid,
  generation_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_builder_id uuid := auth.uid();
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  -- ARES VOICE AUTHORITATIVE ACCESS GUARD V1
  -- Reuse the existing ARES access protocol.
  -- Do not duplicate Genesis or Mining eligibility rules.

  if public.ensure_my_mars_access()
     is distinct from true
  then
    return;
  end if;

  -- Serialize successful Voice authorization with
  -- deferred generation rotation.

  perform pg_catalog.pg_advisory_xact_lock(
    415273, 26001
  );

  -- Never revive an expired participant identity.

  perform ares_voice_private.expire_generations(
    20,
    v_builder_id
  );

  return query
  update ares_voice_private.membership_generations g
  set last_authorized_at = clock_timestamp()
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where g.builder_id = v_builder_id
    and m.id = g.membership_id
    and m.colony_id = g.colony_id
    and m.builder_id = g.builder_id
    and m.status = 'active'
    and c.status = 'active'
  returning
    g.colony_id,
    g.builder_id,
    g.generation_id;
end;
$$;

revoke all on function
public.ares_voice_get_my_generation_v1()
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_get_my_generation_v1()
to authenticated;



-- ARES VOICE COLONY STATUS REVOCATION V1

create index membership_generations_colony_idx
on ares_voice_private.membership_generations (
  colony_id
);

-- Extend the existing queue reason constraint.

alter table ares_voice_private.revocation_queue
  drop constraint revocation_queue_reason_check;

alter table ares_voice_private.revocation_queue
  add constraint revocation_queue_reason_check
  check (
    reason in (
      'membership_left',
      'membership_removed',
      'membership_deleted',
      'membership_changed',
      'colony_deactivated'
    )
  );

-- Rotate every active membership generation when
-- the colony loses active status.
-- Membership records themselves remain unchanged.

create or replace function
ares_voice_private.revoke_colony_generations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if old.status <> 'active'
     or new.status = 'active'
  then
    return null;
  end if;

  -- Use the same transaction lock as the deferred
  -- membership generation trigger.

  perform pg_catalog.pg_advisory_xact_lock(
    415273, 26001
  );

  with retired as materialized (
    select
      g.membership_id,
      g.colony_id,
      g.builder_id,
      g.generation_id
    from ares_voice_private.membership_generations g
    where g.colony_id = old.id
    order by g.membership_id
    for update
  ),
  rotated as (
    update ares_voice_private.membership_generations g
    set
      generation_id = gen_random_uuid(),
      last_authorized_at = null,
      created_at = clock_timestamp()
    from retired r
    where g.membership_id = r.membership_id
      and g.generation_id = r.generation_id
    returning
      r.membership_id,
      r.colony_id,
      r.builder_id,
      r.generation_id
  )
  insert into ares_voice_private.revocation_queue (
    membership_id,
    colony_id,
    builder_id,
    generation_id,
    room_name,
    participant_identity,
    reason
  )
  select
    r.membership_id,
    r.colony_id,
    r.builder_id,
    r.generation_id,
    'ares-colony-' || r.colony_id::text,
    r.builder_id::text || ':' || r.generation_id::text,
    'colony_deactivated'
  from rotated r;

  return null;

end;
$$;

revoke all on function
ares_voice_private.revoke_colony_generations()
from public, anon, authenticated, service_role;

create constraint trigger ares_voice_colony_status_changed
after update of status on public.mars_colonies
deferrable initially deferred
for each row
when (old.status is distinct from new.status)
execute function
ares_voice_private.revoke_colony_generations();



-- ARES VOICE ACCESS LOSS REVOCATION V1

create index membership_generations_builder_idx
on ares_voice_private.membership_generations (
  builder_id
);

alter table ares_voice_private.revocation_queue
  drop constraint revocation_queue_reason_check;

alter table ares_voice_private.revocation_queue
  add constraint revocation_queue_reason_check
  check (
    reason in (
      'membership_left',
      'membership_removed',
      'membership_deleted',
      'membership_changed',
      'colony_deactivated',
      'ares_access_revoked',
      'voice_lease_expired'
    )
  );

create or replace function
ares_voice_private.revoke_builder_access_generations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Only revoke previously authorized access.

  if old.unlocked is distinct from true then
    return null;
  end if;

  if tg_op = 'UPDATE' then

    if new.unlocked is true then
      return null;
    end if;

  end if;

  -- Use the existing deferred Voice lock.
  -- Do not lock or modify Genesis, Mining or GP tables.

  perform pg_catalog.pg_advisory_xact_lock(
    415273, 26001
  );

  with retired as materialized (
    select
      g.membership_id,
      g.colony_id,
      g.builder_id,
      g.generation_id
    from ares_voice_private.membership_generations g
    where g.builder_id = old.builder_id
    order by g.membership_id
    for update
  ),
  rotated as (
    update ares_voice_private.membership_generations g
    set
      generation_id = gen_random_uuid(),
      last_authorized_at = null,
      created_at = clock_timestamp()
    from retired r
    where g.membership_id = r.membership_id
      and g.generation_id = r.generation_id
    returning
      r.membership_id,
      r.colony_id,
      r.builder_id,
      r.generation_id
  )
  insert into ares_voice_private.revocation_queue (
    membership_id,
    colony_id,
    builder_id,
    generation_id,
    room_name,
    participant_identity,
    reason
  )
  select
    r.membership_id,
    r.colony_id,
    r.builder_id,
    r.generation_id,
    'ares-colony-' || r.colony_id::text,
    r.builder_id::text || ':' || r.generation_id::text,
    'ares_access_revoked'
  from rotated r;

  return null;

end;
$$;

revoke all on function
ares_voice_private.revoke_builder_access_generations()
from public, anon, authenticated, service_role;

create constraint trigger
ares_voice_builder_access_revoked
after update of unlocked
on public.builder_mars_access
deferrable initially deferred
for each row
when (
  old.unlocked is true
  and new.unlocked is false
)
execute function
ares_voice_private.revoke_builder_access_generations();

create constraint trigger
ares_voice_builder_access_deleted
after delete
on public.builder_mars_access
deferrable initially deferred
for each row
when (old.unlocked is true)
execute function
ares_voice_private.revoke_builder_access_generations();



-- Only generations with successful authorization
-- participate in subsequent lease maintenance.

create index membership_generations_authorized_idx
on ares_voice_private.membership_generations (
  last_authorized_at
)
where last_authorized_at is not null;



-- ARES VOICE SECURE HEARTBEAT V1

create or replace function
public.ares_voice_heartbeat_v1(
  p_generation_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_builder_id uuid := auth.uid();
begin

  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_generation_id is null then
    return false;
  end if;

  -- Reject foreign or retired generation IDs before
  -- invoking the existing ARES access protocol.

  if not exists (
    select 1
    from ares_voice_private.membership_generations g
    where g.builder_id = v_builder_id
      and g.generation_id = p_generation_id
      and g.last_authorized_at is not null
  ) then
    return false;
  end if;

  -- Preserve existing authoritative access rules.

  if public.ensure_my_mars_access()
     is distinct from true
  then
    return false;
  end if;

  -- Lock order: existing access evaluation first,
  -- then the Voice-only transaction lock.

  perform pg_catalog.pg_advisory_xact_lock(
    415273, 26001
  );

  perform ares_voice_private.expire_generations(
    20,
    v_builder_id
  );

  update ares_voice_private.membership_generations g
  set last_authorized_at = clock_timestamp()
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where g.builder_id = v_builder_id
    and g.generation_id = p_generation_id
    and g.last_authorized_at is not null
    and g.last_authorized_at >
      clock_timestamp() - interval '90 seconds'
    and m.id = g.membership_id
    and m.builder_id = g.builder_id
    and m.colony_id = g.colony_id
    and m.status = 'active'
    and c.status = 'active';

  return found;

end;
$$;

revoke all on function
public.ares_voice_heartbeat_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_heartbeat_v1(uuid)
to authenticated;


-- ARES VOICE SERVER EXPIRATION RPC V1

create or replace function
public.ares_voice_expire_leases_v1(
  p_limit integer default 50
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin

  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  return ares_voice_private.expire_generations(
    p_limit,
    null
  );

end;
$$;

revoke all on function
public.ares_voice_expire_leases_v1(integer)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_expire_leases_v1(integer)
to service_role;


-- ARES VOICE DISTRIBUTED WORKER LOCK V1

create table ares_voice_private.worker_execution_lock (
  lock_name text primary key,

  owner_token uuid,

  acquired_at timestamptz,

  expires_at timestamptz,

  constraint worker_lock_name_check
    check (
      lock_name = 'ares-colony-voice-revoke'
    ),

  constraint worker_lock_state_check
    check (
      (
        owner_token is null
        and acquired_at is null
        and expires_at is null
      )
      or
      (
        owner_token is not null
        and acquired_at is not null
        and expires_at is not null
        and expires_at > acquired_at
      )
    )
);

alter table
  ares_voice_private.worker_execution_lock
enable row level security;

revoke all on table
  ares_voice_private.worker_execution_lock
from public, anon, authenticated, service_role;

insert into
  ares_voice_private.worker_execution_lock (
    lock_name
  )
values (
  'ares-colony-voice-revoke'
);

create or replace function
public.ares_voice_acquire_worker_lock_v1(
  p_owner_token uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
begin

  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_owner_token is null then
    return false;
  end if;

  perform 1
  from ares_voice_private.worker_execution_lock
  where lock_name = 'ares-colony-voice-revoke'
  for update;

  if not found then
    return false;
  end if;

  v_now := clock_timestamp();

  update ares_voice_private.worker_execution_lock
  set
    owner_token = p_owner_token,
    acquired_at = v_now,
    expires_at = v_now + interval '120 seconds'
  where lock_name = 'ares-colony-voice-revoke'
    and (
      owner_token is null
      or expires_at <= v_now
    );

  return found;

end;
$$;

revoke all on function
public.ares_voice_acquire_worker_lock_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_acquire_worker_lock_v1(uuid)
to service_role;


create or replace function
public.ares_voice_check_worker_lock_v1(
  p_owner_token uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin

  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_owner_token is null then
    return false;
  end if;

  return exists (
    select 1
    from ares_voice_private.worker_execution_lock
    where lock_name = 'ares-colony-voice-revoke'
      and owner_token = p_owner_token
      and expires_at > clock_timestamp()
  );

end;
$$;

revoke all on function
public.ares_voice_check_worker_lock_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_check_worker_lock_v1(uuid)
to service_role;


create or replace function
public.ares_voice_release_worker_lock_v1(
  p_owner_token uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin

  if auth.role() is distinct from 'service_role' then
    raise exception 'SERVER_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_owner_token is null then
    return false;
  end if;

  update ares_voice_private.worker_execution_lock
  set
    owner_token = null,
    acquired_at = null,
    expires_at = null
  where lock_name = 'ares-colony-voice-revoke'
    and owner_token = p_owner_token
    and expires_at > clock_timestamp();

  return found;

end;
$$;

revoke all on function
public.ares_voice_release_worker_lock_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_release_worker_lock_v1(uuid)
to service_role;


-- ARES VOICE SECURE SCHEDULER V1

create table ares_voice_private.scheduler_control (
  scheduler_name text primary key,

  enabled boolean not null default false,

  updated_at timestamptz not null
    default clock_timestamp(),

  last_dispatch_at timestamptz,

  last_request_id bigint,

  constraint voice_scheduler_name_check
    check (
      scheduler_name =
        'ares-colony-voice-revoke-v1'
    )
);

alter table
  ares_voice_private.scheduler_control
enable row level security;

revoke all on table
  ares_voice_private.scheduler_control
from public, anon, authenticated, service_role;

insert into
  ares_voice_private.scheduler_control (
    scheduler_name,
    enabled
  )
values (
  'ares-colony-voice-revoke-v1',
  false
);



-- ARES VOICE SCHEDULER RESPONSE TRACKING V1

alter table ares_voice_private.scheduler_control

  add column
    response_pending boolean
    not null default false,

  add column
    last_response_at timestamptz,

  add column
    last_http_status integer,

  add column
    last_response_result text,

  add column
    consecutive_failures integer
    not null default 0,

  add column
    total_dispatches bigint
    not null default 0,

  add column
    total_successes bigint
    not null default 0,

  add column
    total_failures bigint
    not null default 0,

  add constraint
    scheduler_response_pending_check
    check (
      response_pending = false
      or (
        last_request_id is not null
        and last_dispatch_at is not null
      )
    ),

  add constraint
    scheduler_http_status_check
    check (
      last_http_status is null
      or last_http_status between 100 and 599
    ),

  add constraint
    scheduler_response_result_check
    check (
      last_response_result is null
      or last_response_result in (
        'WORKER_SUCCESS',
        'WORKER_ALREADY_RUNNING',
        'WORKER_PARTIAL_FAILURE',
        'WORKER_HTTP_ERROR',
        'WORKER_AUTH_ERROR',
        'WORKER_TIMEOUT',
        'WORKER_RESPONSE_MISSING',
        'WORKER_INVALID_RESPONSE'
      )
    ),

  add constraint
    scheduler_response_counters_check
    check (
      consecutive_failures >= 0
      and total_dispatches >= 0
      and total_successes >= 0
      and total_failures >= 0
      and total_successes + total_failures
        <= total_dispatches
    );


create or replace function
ares_voice_private.collect_worker_response_v1()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request_id bigint;

  v_dispatch_at timestamptz;

  v_pending boolean;

  v_status integer;

  v_timed_out boolean;

  v_transport_error boolean;

  v_content text;

  v_body jsonb;

  v_worker_status text;

  v_result text;

  v_success boolean := false;

  v_response_found boolean := false;

begin

  select
    last_request_id,
    last_dispatch_at,
    response_pending
  into
    v_request_id,
    v_dispatch_at,
    v_pending
  from ares_voice_private.scheduler_control
  where scheduler_name =
    'ares-colony-voice-revoke-v1'
  for update;

  if not found then
    return 'SCHEDULER_NOT_CONFIGURED';
  end if;

  if v_pending is distinct from true then
    return 'NO_PENDING_RESPONSE';
  end if;

  if v_request_id is null
    or v_dispatch_at is null
  then
    return 'INVALID_PENDING_STATE';
  end if;

  if to_regclass('net._http_response') is null then
    return 'RESPONSE_EXTENSION_UNAVAILABLE';
  end if;

  execute $response$
    select
      true,
      status_code::integer,
      coalesce(timed_out, false),
      error_msg is not null,
      content
    from net._http_response
    where id = $1
  $response$
  into
    v_response_found,
    v_status,
    v_timed_out,
    v_transport_error,
    v_content
  using v_request_id;

  if v_response_found is distinct from true then

    if v_dispatch_at >
      clock_timestamp() - interval '90 seconds'
    then
      return 'WORKER_RESPONSE_PENDING';
    end if;

    v_result := 'WORKER_RESPONSE_MISSING';

    v_status := null;

  elsif v_timed_out then

    v_result := 'WORKER_TIMEOUT';

  elsif v_transport_error then

    v_result := 'WORKER_HTTP_ERROR';

  elsif v_status in (401, 403) then

    v_result := 'WORKER_AUTH_ERROR';

  else

    -- Only parse bounded response content.
    -- Never persist the response body.

    if v_content is not null
      and octet_length(v_content) <= 16384
    then

      begin
        v_body := v_content::jsonb;
      exception
        when others then
          v_body := null;
      end;

    end if;

    v_worker_status := v_body ->> 'status';

    if v_status = 200
      and v_worker_status =
        'WORKER_ALREADY_RUNNING'
    then

      v_result := 'WORKER_ALREADY_RUNNING';
      v_success := true;

    elsif v_status = 200
      and v_worker_status in (
        'QUEUE_EMPTY',
        'BATCH_COMPLETED'
      )
    then

      v_result := 'WORKER_SUCCESS';
      v_success := true;

    elsif v_status = 503
      and v_worker_status =
        'BATCH_PARTIAL_FAILURE'
    then

      v_result := 'WORKER_PARTIAL_FAILURE';

    elsif v_status is not null
      and v_status between 200 and 299
    then

      v_result := 'WORKER_INVALID_RESPONSE';

    else

      v_result := 'WORKER_HTTP_ERROR';

    end if;

  end if;

  if v_status is not null
    and v_status not between 100 and 599
  then
    v_status := null;
  end if;

  update ares_voice_private.scheduler_control
  set
    response_pending = false,

    last_response_at = clock_timestamp(),

    last_http_status = v_status,

    last_response_result = v_result,

    consecutive_failures =
      case
        when v_success then 0
        else least(
          consecutive_failures::bigint + 1,
          2147483647
        )::integer
      end,

    total_successes =
      total_successes +
        case when v_success then 1 else 0 end,

    total_failures =
      total_failures +
        case when v_success then 0 else 1 end,

    updated_at = clock_timestamp()

  where scheduler_name =
    'ares-colony-voice-revoke-v1'
    and response_pending = true
    and last_request_id = v_request_id;

  if not found then
    return 'RESPONSE_STATE_CHANGED';
  end if;

  return v_result;

exception
  when others then

    return 'RESPONSE_COLLECTION_FAILED';

end;
$$;

revoke all on function
ares_voice_private.collect_worker_response_v1()
from public, anon, authenticated, service_role;


create or replace function
ares_voice_private.dispatch_worker_v1()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;

  v_project_url text;

  v_secret_key text;

  v_request_id bigint;

  v_last_dispatch_at timestamptz;

  v_secret_count integer;

  v_response_result text;
begin

  select
    enabled,
    last_dispatch_at
  into
    v_enabled,
    v_last_dispatch_at
  from ares_voice_private.scheduler_control
  where scheduler_name =
    'ares-colony-voice-revoke-v1'
  for update;

  if not found then
    return 'SCHEDULER_NOT_CONFIGURED';
  end if;

  if v_enabled is distinct from true then
    return 'SCHEDULER_DISABLED';
  end if;

  v_response_result :=
    ares_voice_private.collect_worker_response_v1();

  if v_response_result = 'WORKER_RESPONSE_PENDING' then
    return 'WORKER_RESPONSE_PENDING';
  end if;

  if v_response_result not in (
    'NO_PENDING_RESPONSE',
    'WORKER_SUCCESS',
    'WORKER_ALREADY_RUNNING',
    'WORKER_PARTIAL_FAILURE',
    'WORKER_HTTP_ERROR',
    'WORKER_AUTH_ERROR',
    'WORKER_TIMEOUT',
    'WORKER_RESPONSE_MISSING',
    'WORKER_INVALID_RESPONSE'
  ) then

    return 'RESPONSE_TRACKING_UNAVAILABLE';

  end if;

  if exists (
    select 1
    from ares_voice_private.worker_execution_lock
    where lock_name =
      'ares-colony-voice-revoke'
      and owner_token is not null
      and expires_at > clock_timestamp()
  ) then
    return 'WORKER_ALREADY_RUNNING';
  end if;

  if v_last_dispatch_at is not null
    and v_last_dispatch_at >
      clock_timestamp() - interval '10 seconds'
  then
    return 'DISPATCH_RATE_LIMITED';
  end if;

  if to_regnamespace('vault') is null
    or to_regnamespace('net') is null
  then
    return 'SCHEDULER_EXTENSIONS_UNAVAILABLE';
  end if;

  -- Dynamic SQL keeps disabled scheduler installation
  -- independent of optional hosted extensions.

  execute $vault$
    select count(*)::integer, max(decrypted_secret)
    from vault.decrypted_secrets
    where name = $1
  $vault$
  into v_secret_count, v_project_url
  using 'ares_voice_project_url';

  if v_secret_count <> 1 then
    return 'PROJECT_URL_NOT_CONFIGURED';
  end if;

  if v_project_url is distinct from
    'https://pvemtnmeewyaqgindocs.supabase.co'
  then
    return 'PROJECT_URL_REJECTED';
  end if;

  execute $vault$
    select count(*)::integer, max(decrypted_secret)
    from vault.decrypted_secrets
    where name = $1
  $vault$
  into v_secret_count, v_secret_key
  using 'ares_voice_worker_secret_key';

  if v_secret_count <> 1
    or v_secret_key is null
    or left(v_secret_key, 10) <> 'sb_secret_'
  then
    return 'WORKER_SECRET_NOT_CONFIGURED';
  end if;

  execute $request$
    select net.http_post(
      url := $1,
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type',
        'application/json',
        'apikey',
        $2::text
      ),
      timeout_milliseconds := 75000
    )
  $request$
  into v_request_id
  using
    v_project_url ||
      '/functions/v1/ares-colony-voice-revoke',
    v_secret_key;

  if v_request_id is null then
    return 'DISPATCH_NOT_CONFIRMED';
  end if;

  update ares_voice_private.scheduler_control
  set
    last_dispatch_at = clock_timestamp(),
    last_request_id = v_request_id,

    response_pending = true,

    total_dispatches = total_dispatches + 1,

    updated_at = clock_timestamp()
  where scheduler_name =
    'ares-colony-voice-revoke-v1';

  return 'WORKER_DISPATCH_QUEUED';

exception
  when others then

    -- Never return secret values, SQL text,
    -- request headers or provider error details.

    return 'SCHEDULER_DISPATCH_FAILED';

end;
$$;

revoke all on function
ares_voice_private.dispatch_worker_v1()
from public, anon, authenticated, service_role;

-- Activation is intentionally excluded.
-- No cron.schedule call.
-- No Vault secret creation.
-- No production HTTP request.


commit;

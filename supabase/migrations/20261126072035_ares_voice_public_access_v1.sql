
-- ARES shared Voice room using existing V1 infrastructure.
-- This UUID is an internal room identifier, not a colony.
-- No Mars membership or Genesis eligibility changes.

create unique index
  membership_generations_public_voice_builder_idx
on ares_voice_private.membership_generations (
  builder_id
)
where colony_id = '00000000-0000-4000-8000-000000000001'::uuid;

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

  
  if not exists (
    select 1
    from auth.users u
    join auth.sessions s on s.user_id = u.id
    where u.id = v_builder_id
      and s.id::text = auth.jwt() ->> 'session_id'
      and coalesce(u.is_anonymous, false) = false
      and u.deleted_at is null
      and (
        u.banned_until is null
        or u.banned_until <= clock_timestamp()
      )
      and (
        s.not_after is null
        or s.not_after > clock_timestamp()
      )
  ) then
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


  insert into ares_voice_private.membership_generations (
    membership_id,
    colony_id,
    builder_id
  )
  values (
    gen_random_uuid(),
    '00000000-0000-4000-8000-000000000001'::uuid,
    v_builder_id
  )
  on conflict do nothing;

  return query
  update ares_voice_private.membership_generations g
  set last_authorized_at = clock_timestamp()
  where g.builder_id = v_builder_id
    and g.colony_id = '00000000-0000-4000-8000-000000000001'::uuid
  returning
    g.colony_id,
    g.builder_id,
    g.generation_id;

end;
$$;

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

  
  if not exists (
    select 1
    from auth.users u
    join auth.sessions s on s.user_id = u.id
    where u.id = v_builder_id
      and s.id::text = auth.jwt() ->> 'session_id'
      and coalesce(u.is_anonymous, false) = false
      and u.deleted_at is null
      and (
        u.banned_until is null
        or u.banned_until <= clock_timestamp()
      )
      and (
        s.not_after is null
        or s.not_after > clock_timestamp()
      )
  ) then
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
  where g.builder_id = v_builder_id
    and g.generation_id = p_generation_id
    and g.last_authorized_at is not null
    and g.last_authorized_at >
      clock_timestamp() - interval '90 seconds'
    and g.colony_id = '00000000-0000-4000-8000-000000000001'::uuid;

  return found;

end;
$$;

revoke all on function
public.ares_voice_get_my_generation_v1()
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_get_my_generation_v1()
to authenticated;

revoke all on function
public.ares_voice_heartbeat_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function
public.ares_voice_heartbeat_v1(uuid)
to authenticated;

-- ============================================================
-- BOBU UNIVERSE
-- Atomic Mobile Assertion Commit v1
--
-- After cryptographic assertion verification succeeds:
--   1. advance monotonic App Attest counter
--   2. consume one-time challenge
--
-- Both operations happen in the SAME database transaction.
-- ============================================================

begin;

create or replace function
public.commit_verified_mobile_assertion(
  p_builder_id uuid,
  p_platform text,
  p_key_id text,
  p_counter bigint,
  p_challenge_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_platform text :=
    lower(trim(coalesce(p_platform, '')));

  v_key_id text :=
    trim(coalesce(p_key_id, ''));

  v_key_updated integer := 0;
  v_challenge_updated integer := 0;
begin
  if p_builder_id is null then
    return false;
  end if;

  if p_challenge_id is null then
    return false;
  end if;

  if v_platform not in ('ios', 'android') then
    return false;
  end if;

  if v_key_id = '' then
    return false;
  end if;

  if p_counter is null or p_counter <= 0 then
    return false;
  end if;

  /*
   * Lock and advance only a valid production key
   * belonging to this exact Builder.
   *
   * Monotonic comparison rejects assertion replay
   * and counter rollback.
   */
  update public.mobile_attested_keys
  set
    assertion_counter = p_counter,
    last_asserted_at = now()
  where builder_id = p_builder_id
    and platform = v_platform
    and key_id = v_key_id
    and environment = 'production'
    and revoked_at is null
    and assertion_counter < p_counter;

  get diagnostics v_key_updated = row_count;

  if v_key_updated <> 1 then
    return false;
  end if;

  /*
   * Consume the exact fresh challenge that belongs
   * to this Builder and platform.
   */
  update public.mobile_attestation_challenges
  set consumed_at = now()
  where id = p_challenge_id
    and builder_id = p_builder_id
    and platform = v_platform
    and purpose = 'mobile_pioneer'
    and consumed_at is null
    and expires_at > now();

  get diagnostics v_challenge_updated = row_count;

  /*
   * Raising rolls the entire function transaction back,
   * including the counter update above.
   */
  if v_challenge_updated <> 1 then
    raise exception
      'Mobile assertion challenge could not be consumed';
  end if;

  return true;
end;
$$;

revoke all
on function public.commit_verified_mobile_assertion(
  uuid,
  text,
  text,
  bigint,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.commit_verified_mobile_assertion(
  uuid,
  text,
  text,
  bigint,
  uuid
)
to service_role;

comment on function
public.commit_verified_mobile_assertion(
  uuid,
  text,
  text,
  bigint,
  uuid
) is
  'Atomically advances a verified production mobile assertion counter and consumes its one-time challenge. Service-role only.';

commit;

-- ============================================================
-- BOBU UNIVERSE
-- Trusted Mobile Pioneer Claim v2
--
-- Called only by trusted service-role verification code
-- after native app attestation succeeds.
--
-- Reward:
--   +500 Personal GP
--   once per Builder
-- ============================================================

begin;

create or replace function
public.claim_verified_mobile_pioneer_reward(
  p_builder_id uuid,
  p_platform text,
  p_key_id text
)
returns table (
  awarded boolean,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_platform text :=
    lower(trim(coalesce(p_platform, '')));

  v_key_id text :=
    trim(coalesce(p_key_id, ''));

  v_awarded boolean := false;
  v_total_gp bigint := 0;
  v_ledger_id uuid := null;
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'Unsupported platform';
  end if;

  if v_key_id = '' then
    raise exception 'Attested key ID is required';
  end if;

  /*
   * Defense in depth:
   *
   * Reward cannot be issued merely because the
   * Edge Function says verification succeeded.
   *
   * The key must already exist in the trusted
   * server-side attested key registry and belong
   * to this exact Builder.
   */
  if not exists (
    select 1
    from public.mobile_attested_keys as key
    where key.builder_id = p_builder_id
      and key.platform = v_platform
      and key.key_id = v_key_id
      and key.environment = 'production'
      and key.revoked_at is null
  ) then
    raise exception
      'Verified production mobile attestation is required';
  end if;

  select
    reward.awarded,
    reward.total_gp,
    reward.ledger_id
  into
    v_awarded,
    v_total_gp,
    v_ledger_id
  from public.award_builder_gp(
    p_builder_id,
    'mobile_pioneer',
    500,
    'mobile-pioneer:v1',
    'bobu-mobile',
    jsonb_build_object(
      'source',
      'verified_native_attestation',
      'platform',
      v_platform,
      'attested_key_id',
      v_key_id,
      'reward_version',
      1
    )
  ) as reward;

  return query
  select
    v_awarded,
    500::bigint,
    coalesce(v_total_gp, 0),
    v_ledger_id;
end;
$$;

revoke all
on function
public.claim_verified_mobile_pioneer_reward(
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function
public.claim_verified_mobile_pioneer_reward(
  uuid,
  text,
  text
)
to service_role;

comment on function
public.claim_verified_mobile_pioneer_reward(
  uuid,
  text,
  text
) is
  'Awards Mobile Pioneer GP only when a production server-verified mobile attestation key belongs to the requested Builder.';

commit;

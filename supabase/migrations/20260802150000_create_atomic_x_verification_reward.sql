-- ============================================================
-- BOBU UNIVERSE
-- Atomic X Verification and Reward Engine
--
-- Links the trusted Supabase X OAuth identity, marks it verified
-- and credits the one-time GP reward in one transaction.
-- ============================================================

create or replace function public.claim_x_identity_reward(
  p_builder_id uuid,
  p_provider_user_id text,
  p_username text default null
)
returns table (
  verified boolean,
  rewarded boolean,
  already_rewarded boolean,
  reward_gp bigint,
  total_gp bigint,
  ledger_id uuid,
  completed_at timestamptz,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_provider_user_id text;
  v_username text;
  v_existing_builder_id uuid;
  v_rewarded boolean;
  v_total_gp bigint;
  v_ledger_id uuid;
  v_completed_at timestamptz := now();
  v_reward_gp constant bigint := 5000;
begin
  if p_builder_id is null then
    raise exception 'Builder ID is required.';
  end if;

  v_provider_user_id :=
    trim(coalesce(p_provider_user_id, ''));

  v_username :=
    nullif(trim(coalesce(p_username, '')), '');

  if v_provider_user_id = '' then
    raise exception 'X provider user ID is required.';
  end if;

  /*
   * One X identity may belong to only one Builder.
   */
  select identity.builder_id
  into v_existing_builder_id
  from public.builder_social_identities as identity
  where lower(identity.provider) = 'x'
    and identity.provider_user_id = v_provider_user_id
  limit 1
  for update;

  if (
    v_existing_builder_id is not null
    and v_existing_builder_id <> p_builder_id
  ) then
    return query
    select
      false,
      false,
      false,
      0::bigint,
      coalesce(profile.gp, 0),
      null::uuid,
      null::timestamptz,
      'identity_already_linked'::text
    from public.builder_profiles as profile
    where profile.builder_id = p_builder_id;

    if not found then
      return query
      select
        false,
        false,
        false,
        0::bigint,
        0::bigint,
        null::uuid,
        null::timestamptz,
        'identity_already_linked'::text;
    end if;

    return;
  end if;

  /*
   * Create or refresh the trusted X identity first.
   * The whole function remains one PostgreSQL transaction.
   */
  insert into public.builder_social_identities (
    builder_id,
    provider,
    provider_user_id,
    username,
    verified,
    verified_at,
    updated_at
  )
  values (
    p_builder_id,
    'x',
    v_provider_user_id,
    v_username,
    true,
    v_completed_at,
    v_completed_at
  )
  on conflict on constraint
    builder_social_identities_builder_id_provider_key
  do update
  set
    provider_user_id = excluded.provider_user_id,
    username = excluded.username,
    verified = true,
    verified_at = coalesce(
      public.builder_social_identities.verified_at,
      excluded.verified_at
    ),
    updated_at = excluded.updated_at;

  select
    reward.awarded,
    reward.total_gp,
    reward.ledger_id
  into
    v_rewarded,
    v_total_gp,
    v_ledger_id
  from public.award_builder_gp(
    p_builder_id,
    'social_verification',
    v_reward_gp,
    concat(
      'social-verification:x:',
      p_builder_id::text
    ),
    'x',
    jsonb_build_object(
      'provider_user_id',
      v_provider_user_id,
      'username',
      v_username
    )
  ) as reward;

  update public.builder_social_identities
  set
    verified = true,
    verified_at = coalesce(
      verified_at,
      v_completed_at
    ),
    reward_claimed = true,
    reward_claimed_at = coalesce(
      reward_claimed_at,
      v_completed_at
    ),
    updated_at = v_completed_at
  where builder_id = p_builder_id
    and lower(provider) = 'x';

  return query
  select
    true,
    v_rewarded,
    not v_rewarded,
    case
      when v_rewarded then v_reward_gp
      else 0::bigint
    end,
    coalesce(v_total_gp, 0),
    v_ledger_id,
    v_completed_at,
    case
      when v_rewarded then 'rewarded'
      else 'already_rewarded'
    end;
end;
$$;


revoke all
on function public.claim_x_identity_reward(
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.claim_x_identity_reward(
  uuid,
  text,
  text
)
to service_role;


comment on function public.claim_x_identity_reward(
  uuid,
  text,
  text
) is
  'Atomically links and verifies a trusted Supabase X OAuth identity, prevents cross-Builder identity reuse and credits the one-time 5000 GP reward.';

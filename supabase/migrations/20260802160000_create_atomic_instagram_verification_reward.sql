-- ============================================================
-- BOBU UNIVERSE
-- Atomic Instagram Verification and Reward Engine
--
-- Accepts only a trusted Instagram identity obtained by the
-- server-side OAuth callback. Links the identity, verifies it,
-- and credits the one-time 5000 GP reward atomically.
-- ============================================================

create or replace function public.claim_instagram_identity_reward(
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
    raise exception
      'Instagram provider user ID is required.';
  end if;

  /*
   * One Instagram identity may belong to only one Builder.
   */
  select identity.builder_id
  into v_existing_builder_id
  from public.builder_social_identities as identity
  where lower(identity.provider) = 'instagram'
    and identity.provider_user_id = v_provider_user_id
  limit 1
  for update;

  if (
    v_existing_builder_id is not null
    and v_existing_builder_id <> p_builder_id
  ) then
    select coalesce(profile.gp, 0)
    into v_total_gp
    from public.builder_profiles as profile
    where profile.builder_id = p_builder_id;

    return query
    select
      false,
      false,
      false,
      0::bigint,
      coalesce(v_total_gp, 0),
      null::uuid,
      null::timestamptz,
      'identity_already_linked'::text;

    return;
  end if;

  /*
   * Identity and reward are completed inside one PostgreSQL
   * transaction. Any failure rolls the whole operation back.
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
    'instagram',
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
      'social-verification:instagram:',
      p_builder_id::text
    ),
    'instagram',
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
    and lower(provider) = 'instagram';

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
on function public.claim_instagram_identity_reward(
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.claim_instagram_identity_reward(
  uuid,
  text,
  text
)
to service_role;


comment on function public.claim_instagram_identity_reward(
  uuid,
  text,
  text
) is
  'Atomically links and verifies a trusted Instagram OAuth identity, prevents cross-Builder reuse and credits the one-time 5000 GP reward.';

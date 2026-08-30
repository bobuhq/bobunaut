begin;

create or replace function public.activate_eligible_builder_referral(
  p_referred_builder_id uuid
)
returns table (
  activated boolean,
  referral_status text,
  referrer_id uuid,
  activated_at timestamptz,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer_id uuid;
  v_status text;
  v_activated_at timestamptz;
  v_telegram_verified boolean := false;
  v_x_verified boolean := false;
  v_has_mining_activity boolean := false;
begin
  if p_referred_builder_id is null then
    raise exception
      'Referred Builder ID is required';
  end if;

  select
    referral.referrer_id,
    referral.status,
    referral.activated_at
  into
    v_referrer_id,
    v_status,
    v_activated_at
  from public.builder_referrals as referral
  where referral.referred_id =
    p_referred_builder_id
  for update;

  if v_referrer_id is null then
    return query
    select
      false,
      null::text,
      null::uuid,
      null::timestamptz,
      'referral_not_found'::text;

    return;
  end if;

  if v_status = 'active' then
    return query
    select
      false,
      'active'::text,
      v_referrer_id,
      v_activated_at,
      'already_active'::text;

    return;
  end if;

  if v_status <> 'pending' then
    return query
    select
      false,
      v_status,
      v_referrer_id,
      v_activated_at,
      'referral_status_not_eligible'::text;

    return;
  end if;

  select exists (
    select 1
    from public.builder_social_identities as identity
    where identity.builder_id =
      p_referred_builder_id
      and lower(identity.provider) = 'telegram'
      and identity.verified = true
  )
  into v_telegram_verified;

  select exists (
    select 1
    from public.builder_social_identities as identity
    where identity.builder_id =
      p_referred_builder_id
      and lower(identity.provider) = 'x'
      and identity.verified = true
  )
  into v_x_verified;

  select exists (
    select 1
    from public.builder_mining_sessions as mining
    where mining.builder_id =
      p_referred_builder_id
      and mining.status in (
        'active',
        'completed',
        'claimed'
      )
  )
  into v_has_mining_activity;

  if not v_telegram_verified then
    return query
    select
      false,
      v_status,
      v_referrer_id,
      v_activated_at,
      'telegram_not_verified'::text;

    return;
  end if;

  if not v_x_verified then
    return query
    select
      false,
      v_status,
      v_referrer_id,
      v_activated_at,
      'x_not_verified'::text;

    return;
  end if;

  if not v_has_mining_activity then
    return query
    select
      false,
      v_status,
      v_referrer_id,
      v_activated_at,
      'mining_activity_required'::text;

    return;
  end if;

  update public.builder_referrals as referral
  set
    status = 'active',
    activated_at = coalesce(
      referral.activated_at,
      now()
    )
  where referral.referred_id =
    p_referred_builder_id
    and referral.status = 'pending'
  returning
    referral.activated_at
  into v_activated_at;

  if v_activated_at is null then
    return query
    select
      false,
      v_status,
      v_referrer_id,
      null::timestamptz,
      'activation_not_applied'::text;

    return;
  end if;

  return query
  select
    true,
    'active'::text,
    v_referrer_id,
    v_activated_at,
    'activated'::text;
end;
$$;

revoke all
on function public.activate_eligible_builder_referral(uuid)
from public, anon, authenticated;

grant execute
on function public.activate_eligible_builder_referral(uuid)
to service_role;


create or replace function public.create_my_mobile_attestation_challenge(
  p_platform text
)
returns table (
  challenge_id uuid,
  challenge text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_platform text :=
    lower(trim(coalesce(p_platform, '')));
  v_challenge text;
  v_id uuid;
  v_expires_at timestamptz :=
    now() + interval '5 minutes';
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'Unsupported platform';
  end if;

  insert into public.builder_profiles(builder_id)
  values (v_builder_id)
  on conflict (builder_id) do nothing;

  v_challenge :=
    encode(
      extensions.gen_random_bytes(32),
      'hex'
    );

  insert into public.mobile_attestation_challenges (
    builder_id,
    challenge,
    platform,
    purpose,
    expires_at
  )
  values (
    v_builder_id,
    v_challenge,
    v_platform,
    'mobile_pioneer',
    v_expires_at
  )
  returning id into v_id;

  return query
  select
    v_id,
    v_challenge,
    v_expires_at;
end;
$$;

revoke all
on function public.create_my_mobile_attestation_challenge(text)
from public, anon, authenticated;

grant execute
on function public.create_my_mobile_attestation_challenge(text)
to authenticated;

grant execute
on function public.create_my_mobile_attestation_challenge(text)
to service_role;

commit;

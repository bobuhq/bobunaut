-- ============================================================
-- BOBU UNIVERSE
-- Secure Invite Attribution RPC
-- ============================================================

begin;

create or replace function public.attribute_builder_invite(
  p_invite_code text
)
returns table (
  attributed boolean,
  referral_status text,
  attributed_referrer_id uuid,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid;
  v_referrer_id uuid;
  v_existing_referrer_id uuid;
  v_profile_referrer_id uuid;
  v_existing_status text;
  v_normalized_code text;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  v_normalized_code := upper(trim(coalesce(p_invite_code, '')));

  if char_length(v_normalized_code) = 0 then
    raise exception 'Invite code is required';
  end if;

  -- Ensure the authenticated Builder profile exists.
  insert into public.builder_profiles (
    builder_id
  )
  values (
    v_builder_id
  )
  on conflict (builder_id) do nothing;

  -- Serialize attribution attempts for this Builder.
  select profile.referred_by
  into v_profile_referrer_id
  from public.builder_profiles as profile
  where profile.builder_id = v_builder_id
  for update;

  select profile.builder_id
  into v_referrer_id
  from public.builder_profiles as profile
  where upper(profile.invite_code) = v_normalized_code;

  if v_referrer_id is null then
    return query
    select
      false,
      null::text,
      null::uuid,
      'invalid_invite_code'::text;

    return;
  end if;

  if v_referrer_id = v_builder_id then
    return query
    select
      false,
      null::text,
      null::uuid,
      'self_referral_not_allowed'::text;

    return;
  end if;

  if v_profile_referrer_id is not null then
    if v_profile_referrer_id = v_referrer_id then
      return query
      select
        false,
        'pending'::text,
        v_profile_referrer_id,
        'already_attributed'::text;

      return;
    end if;

    return query
    select
      false,
      null::text,
      v_profile_referrer_id,
      'attribution_locked'::text;

    return;
  end if;

  select
    referral.referrer_id,
    referral.status
  into
    v_existing_referrer_id,
    v_existing_status
  from public.builder_referrals as referral
  where referral.referred_id = v_builder_id;

  if v_existing_referrer_id is not null then
    if v_existing_referrer_id = v_referrer_id then
      return query
      select
        false,
        v_existing_status,
        v_existing_referrer_id,
        'already_attributed'::text;
    end if;

    return query
    select
      false,
      v_existing_status,
      v_existing_referrer_id,
      'attribution_locked'::text;

    return;
  end if;

  insert into public.builder_referrals (
    referrer_id,
    referred_id,
    status
  )
  values (
    v_referrer_id,
    v_builder_id,
    'pending'
  );

  update public.builder_profiles
  set referred_by = v_referrer_id
  where builder_id = v_builder_id
    and referred_by is null;

  return query
  select
    true,
    'pending'::text,
    v_referrer_id,
    'attributed'::text;
end;
$$;

revoke all on function public.attribute_builder_invite(text)
from public, anon;

grant execute on function public.attribute_builder_invite(text)
to authenticated, service_role;

comment on function public.attribute_builder_invite(text) is
'Securely attributes the authenticated Builder to one invite code. Attribution is immutable and begins in pending status.';

commit;

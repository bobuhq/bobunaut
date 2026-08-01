-- ============================================================
-- BOBU UNIVERSE
-- Identity Security + Referral Eligibility Activation
--
-- A referral becomes active when the referred Builder:
--   1. has verified Telegram,
--   2. has verified X,
--   3. has started at least one valid mining session.
--
-- Wallet activation is intentionally not required here.
-- Wallet activation controls future wallet migration only.
-- ============================================================

begin;


-- ============================================================
-- SOCIAL IDENTITY WRITE HARDENING
--
-- Browser clients may read their own identities.
-- Insert, update and delete operations are restricted to
-- trusted server-side operations using service_role.
-- ============================================================

drop policy if exists
  "Users can insert their own social identities"
on public.builder_social_identities;

drop policy if exists
  "Users can update their own social identities"
on public.builder_social_identities;

revoke insert, update, delete
on table public.builder_social_identities
from authenticated, anon;

grant select
on table public.builder_social_identities
to authenticated;


-- ============================================================
-- REFERRAL ACTIVATION AUDIT DATA
-- ============================================================

alter table public.builder_referrals
add column if not exists activated_at timestamptz;


comment on column
public.builder_referrals.activated_at is
  'Server-recorded timestamp when a pending referral satisfied eligibility requirements and became active.';


-- ============================================================
-- REFERRAL ACTIVATION ENGINE
--
-- This function is intentionally service-role only.
-- It evaluates trusted database records and never accepts
-- verification or mining status from the browser.
-- ============================================================

create or replace function
public.activate_eligible_builder_referral(
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

  update public.builder_referrals
  set
    status = 'active',
    activated_at = coalesce(
      activated_at,
      now()
    )
  where referred_id = p_referred_builder_id
    and status = 'pending'
  returning
    builder_referrals.activated_at
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
on function public.activate_eligible_builder_referral(
  uuid
)
from public, anon, authenticated;

grant execute
on function public.activate_eligible_builder_referral(
  uuid
)
to service_role;


comment on function
public.activate_eligible_builder_referral(uuid) is
  'Activates a pending referral after trusted verification confirms Telegram, X and valid mining activity, and records the activation timestamp.';


commit;

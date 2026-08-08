-- ============================================================
-- BOBU UNIVERSE
-- Secure Referral Activation Reward Engine v1
--
-- Rules:
--   * Invite attribution alone earns nothing.
--   * Pending referrals earn nothing.
--   * Referral must pass trusted eligibility checks.
--   * First transition pending -> active awards referrer 100 GP.
--   * Reward is idempotent per referred Builder.
--   * Browser clients cannot call reward helpers directly.
-- ============================================================

begin;


-- ============================================================
-- REFERRAL ACTIVATION REWARD
-- ============================================================

create or replace function
public.reward_activated_direct_referral()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reward_result record;
  v_active_direct_referrals bigint := 0;
begin
  /*
   * Only the first real transition into ACTIVE is rewardable.
   *
   * Re-running verification, reopening the site, repeating
   * mining actions or replaying requests cannot enter this
   * branch unless the relationship actually changed state.
   */
  if old.status is distinct from 'active'
     and new.status = 'active'
     and new.activated_at is not null then

    select *
    into v_reward_result
    from public.award_builder_gp(
      new.referrer_id,
      'eligible_referral',
      100,
      'eligible-referral:' || new.referred_id::text,
      'referral',
      jsonb_build_object(
        'referred_builder_id', new.referred_id,
        'referrer_builder_id', new.referrer_id,
        'activated_at', new.activated_at,
        'reward_version', 1
      )
    );

    /*
     * Count only authoritative ACTIVE direct referrals.
     * builder_profiles.referral_count is intentionally NOT used
     * as an economic source of truth.
     */
    select count(*)::bigint
    into v_active_direct_referrals
    from public.builder_referrals as referral
    where referral.referrer_id = new.referrer_id
      and referral.status = 'active'
      and referral.activated_at is not null;

    /*
     * First Active Builder
     */
    if v_active_direct_referrals >= 1 then
      perform *
      from public.award_builder_gp(
        new.referrer_id,
        'referral_milestone',
        500,
        'referral-milestone:1',
        'referral',
        jsonb_build_object(
          'milestone', 1,
          'active_direct_referrals',
            v_active_direct_referrals,
          'reward_version', 1
        )
      );
    end if;

    /*
     * Galaxy Crew
     */
    if v_active_direct_referrals >= 5 then
      perform *
      from public.award_builder_gp(
        new.referrer_id,
        'referral_milestone',
        1000,
        'referral-milestone:5',
        'referral',
        jsonb_build_object(
          'milestone', 5,
          'active_direct_referrals',
            v_active_direct_referrals,
          'reward_version', 1
        )
      );
    end if;

    /*
     * Galaxy Builder
     */
    if v_active_direct_referrals >= 10 then
      perform *
      from public.award_builder_gp(
        new.referrer_id,
        'referral_milestone',
        2000,
        'referral-milestone:10',
        'referral',
        jsonb_build_object(
          'milestone', 10,
          'active_direct_referrals',
            v_active_direct_referrals,
          'reward_version', 1
        )
      );
    end if;

  end if;

  return new;
end;
$$;


drop trigger if exists
  reward_activated_direct_referral
on public.builder_referrals;

create trigger
  reward_activated_direct_referral
after update of status, activated_at
on public.builder_referrals
for each row
execute function
  public.reward_activated_direct_referral();


revoke all
on function public.reward_activated_direct_referral()
from public, anon, authenticated;


comment on function
public.reward_activated_direct_referral() is
  'Awards the referrer 100 Personal GP exactly once when a trusted pending direct referral becomes active.';


-- ============================================================
-- AUTOMATIC ELIGIBILITY RE-EVALUATION
--
-- The existing activate_eligible_builder_referral() function
-- remains the single eligibility authority.
--
-- We merely ask it to re-evaluate after trusted source records
-- change.
-- ============================================================

create or replace function
public.recheck_builder_referral_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid;
begin
  v_builder_id := new.builder_id;

  if v_builder_id is null then
    return new;
  end if;

  /*
   * No reward logic exists here.
   * The authoritative activation function performs all checks.
   */
  perform *
  from public.activate_eligible_builder_referral(
    v_builder_id
  );

  return new;
end;
$$;


revoke all
on function public.recheck_builder_referral_eligibility()
from public, anon, authenticated;


-- ============================================================
-- SOCIAL IDENTITY RECHECK
--
-- Only verified Telegram/X states can be relevant.
-- The activation function still re-validates BOTH identities
-- from trusted database state.
-- ============================================================

drop trigger if exists
  recheck_referral_after_identity_change
on public.builder_social_identities;

create trigger
  recheck_referral_after_identity_change
after insert or update of verified
on public.builder_social_identities
for each row
when (
  new.verified = true
  and lower(new.provider) in ('telegram', 'x')
)
execute function
  public.recheck_builder_referral_eligibility();


-- ============================================================
-- MINING RECHECK
--
-- A valid active/completed/claimed server mining session is
-- one of the eligibility requirements.
-- ============================================================

drop trigger if exists
  recheck_referral_after_mining_change
on public.builder_mining_sessions;

create trigger
  recheck_referral_after_mining_change
after insert or update of status
on public.builder_mining_sessions
for each row
when (
  new.status in ('active', 'completed', 'claimed')
)
execute function
  public.recheck_builder_referral_eligibility();


comment on function
public.recheck_builder_referral_eligibility() is
  'Re-evaluates referral eligibility after trusted Telegram, X or mining records change.';


commit;

-- BOBU Galactic Chain V2
-- Only future eligible activations use new amounts.
-- Existing ledger and GP balances are untouched.
-- Existing idempotency keys remain unchanged.

begin;

create or replace function
public.reward_activated_direct_referral()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ancestor record;
  v_reward bigint;
  v_active_direct_referrals bigint := 0;
begin
  /*
   * Galactic Chain runs ONLY on the first authoritative
   * transition into ACTIVE.
   */
  if old.status is distinct from 'active'
     and new.status = 'active'
     and new.activated_at is not null then

    /*
     * Walk upward from the newly activated Builder.
     * Maximum network depth: 10.
     */
    for v_ancestor in
      with recursive ancestry as (
        select
          referral.referrer_id as ancestor_id,
          1 as depth
        from public.builder_referrals as referral
        where referral.referred_id = new.referred_id
          and referral.status = 'active'
          and referral.activated_at is not null

        union all

        select
          parent.referrer_id as ancestor_id,
          ancestry.depth + 1 as depth
        from ancestry
        join public.builder_referrals as parent
          on parent.referred_id = ancestry.ancestor_id
         and parent.status = 'active'
         and parent.activated_at is not null
        where ancestry.depth < 10
      )
      select
        ancestry.ancestor_id,
        ancestry.depth
      from ancestry
      order by ancestry.depth
    loop

      v_reward :=
        case v_ancestor.depth
          when 1 then 500
          when 2 then 250
          when 3 then 150
          when 4 then 100
          when 5 then 50
          when 6 then 25
          when 7 then 25
          when 8 then 25
          when 9 then 25
          when 10 then 25
          else 0
        end;

      if v_reward > 0 then
        perform *
        from public.award_pending_network_gp(
          v_ancestor.ancestor_id,
          new.referred_id,
          v_reward,
          'galactic_chain_activation',
          new.referred_id::text,
          v_ancestor.depth,
          'galactic-chain:v1:' ||
            new.referred_id::text ||
            ':depth:' ||
            v_ancestor.depth::text,
          jsonb_build_object(
            'reward_version', 1,
            'network_model', 'galactic_chain',
            'activated_builder_id', new.referred_id,
            'depth', v_ancestor.depth,
            'reward_gp', v_reward,
            'activated_at', new.activated_at
          )
        );
      end if;

    end loop;

    /*
     * Existing direct-referral milestones remain independent.
     */
    select count(*)::bigint
    into v_active_direct_referrals
    from public.builder_referrals as referral
    where referral.referrer_id = new.referrer_id
      and referral.status = 'active'
      and referral.activated_at is not null;

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
          'active_direct_referrals', v_active_direct_referrals,
          'reward_version', 1
        )
      );
    end if;

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
          'active_direct_referrals', v_active_direct_referrals,
          'reward_version', 1
        )
      );
    end if;

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
          'active_direct_referrals', v_active_direct_referrals,
          'reward_version', 1
        )
      );
    end if;

  end if;

  return new;
end;
$$;


commit;

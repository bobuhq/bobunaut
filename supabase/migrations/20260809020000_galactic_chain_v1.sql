-- ============================================================
-- BOBU UNIVERSE
-- Galactic Chain V1
--
-- Activation Network GP:
-- L1  = 50 GP
-- L2  = 13 GP
-- L3  =  6 GP
-- L4  =  3 GP
-- L5  =  2 GP
-- L6  =  1 GP
-- L7  =  1 GP
-- L8  =  1 GP
-- L9  =  1 GP
-- L10 =  1 GP
--
-- Source Builder loses nothing.
-- Rewards are generated as Pending Network GP.
-- Exactly once per ancestor / activated Builder / depth.
-- ============================================================

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
          when 1 then 50
          when 2 then 13
          when 3 then 6
          when 4 then 3
          when 5 then 2
          when 6 then 1
          when 7 then 1
          when 8 then 1
          when 9 then 1
          when 10 then 1
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

revoke all
on function public.reward_activated_direct_referral()
from public, anon, authenticated;

comment on function
public.reward_activated_direct_referral() is
  'Galactic Chain V1: distributes activation Network GP through verified ACTIVE referral ancestry up to depth 10.';


-- ============================================================
-- GALACTIC CHAIN READ MODEL
--
-- Authenticated Builders may read only their OWN Chain.
-- No Builder ID is accepted from the client.
--
-- Returns all 10 levels, including zero-value levels.
-- Financial totals come only from the immutable Network GP
-- ledger and are never calculated by the browser/mobile app.
-- ============================================================

create or replace function
public.get_my_galactic_chain_summary()
returns table (
  depth integer,
  reward_per_builder bigint,
  rewarded_builder_count bigint,
  pending_chain_gp bigint,
  eligible_chain_gp bigint,
  total_chain_gp bigint
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with levels as (
    select
      level_number as depth,
      case level_number
        when 1 then 50::bigint
        when 2 then 13::bigint
        when 3 then 6::bigint
        when 4 then 3::bigint
        when 5 then 2::bigint
        when 6 then 1::bigint
        when 7 then 1::bigint
        when 8 then 1::bigint
        when 9 then 1::bigint
        when 10 then 1::bigint
      end as reward_per_builder
    from generate_series(1, 10) as level_number
  ),
  ledger_totals as (
    select
      ledger.depth,
      count(distinct ledger.source_builder_id)::bigint
        as rewarded_builder_count,

      coalesce(
        sum(ledger.amount)
          filter (where ledger.status = 'pending'),
        0
      )::bigint as pending_chain_gp,

      coalesce(
        sum(ledger.amount)
          filter (where ledger.status = 'eligible'),
        0
      )::bigint as eligible_chain_gp,

      coalesce(
        sum(ledger.amount)
          filter (
            where ledger.status in ('pending', 'eligible')
          ),
        0
      )::bigint as total_chain_gp

    from public.builder_network_gp_ledger as ledger
    where ledger.builder_id = auth.uid()
      and ledger.source_reward_type =
        'galactic_chain_activation'
      and ledger.depth between 1 and 10
    group by ledger.depth
  )
  select
    levels.depth,
    levels.reward_per_builder,
    coalesce(
      ledger_totals.rewarded_builder_count,
      0
    ),
    coalesce(
      ledger_totals.pending_chain_gp,
      0
    ),
    coalesce(
      ledger_totals.eligible_chain_gp,
      0
    ),
    coalesce(
      ledger_totals.total_chain_gp,
      0
    )
  from levels
  left join ledger_totals
    on ledger_totals.depth = levels.depth
  where auth.uid() is not null
  order by levels.depth;
$$;

revoke all
on function public.get_my_galactic_chain_summary()
from public, anon;

grant execute
on function public.get_my_galactic_chain_summary()
to authenticated;

comment on function
public.get_my_galactic_chain_summary() is
  'Returns the authenticated Builder Galactic Chain reward breakdown for levels 1 through 10 from the immutable Network GP ledger.';



-- ============================================================
-- BACKFILL EXISTING ACTIVE REFERRALS
--
-- Only authoritative ACTIVE referrals with activated_at set
-- are eligible.
--
-- Uses the exact same idempotency key as the live trigger:
--
-- galactic-chain:v1:<source-builder>:depth:<n>
--
-- Therefore this backfill is safe to replay and cannot
-- duplicate Galactic Chain rewards.
-- ============================================================

do $$
declare
  v_source record;
  v_ancestor record;
  v_reward bigint;
begin
  for v_source in
    select
      referral.referred_id,
      referral.activated_at
    from public.builder_referrals as referral
    where referral.status = 'active'
      and referral.activated_at is not null
    order by referral.activated_at asc,
             referral.referred_id asc
  loop

    for v_ancestor in
      with recursive ancestry as (
        select
          referral.referrer_id as ancestor_id,
          1 as depth
        from public.builder_referrals as referral
        where referral.referred_id =
          v_source.referred_id
          and referral.status = 'active'
          and referral.activated_at is not null

        union all

        select
          parent.referrer_id as ancestor_id,
          ancestry.depth + 1 as depth
        from ancestry
        join public.builder_referrals as parent
          on parent.referred_id =
            ancestry.ancestor_id
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
          when 1 then 50
          when 2 then 13
          when 3 then 6
          when 4 then 3
          when 5 then 2
          when 6 then 1
          when 7 then 1
          when 8 then 1
          when 9 then 1
          when 10 then 1
          else 0
        end;

      if v_reward > 0 then
        perform *
        from public.award_pending_network_gp(
          v_ancestor.ancestor_id,
          v_source.referred_id,
          v_reward,
          'galactic_chain_activation',
          v_source.referred_id::text,
          v_ancestor.depth,
          'galactic-chain:v1:' ||
            v_source.referred_id::text ||
            ':depth:' ||
            v_ancestor.depth::text,
          jsonb_build_object(
            'reward_version', 1,
            'network_model', 'galactic_chain',
            'backfill', true,
            'activated_builder_id',
              v_source.referred_id,
            'depth',
              v_ancestor.depth,
            'reward_gp',
              v_reward,
            'activated_at',
              v_source.activated_at
          )
        );
      end if;

    end loop;
  end loop;
end;
$$;

commit;

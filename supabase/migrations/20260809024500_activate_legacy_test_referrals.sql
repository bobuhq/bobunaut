-- ============================================================
-- BOBU UNIVERSE
-- Pre-launch legacy referral activation + Galactic Chain repair
--
-- One-time migration for referral records created before launch.
-- Future Builders continue to use the trusted:
-- Telegram + X + mining activation flow.
--
-- Galactic Chain:
-- L1 50
-- L2 13
-- L3 6
-- L4 3
-- L5 2
-- L6-L10 1
--
-- The repair pass uses the same Galactic Chain V1
-- idempotency keys, therefore existing rewards cannot
-- be duplicated.
-- ============================================================

begin;

-- ============================================================
-- 1. ACTIVATE PRE-LAUNCH LEGACY REFERRALS
--
-- Important:
-- Do not activate future referrals with this migration.
-- ============================================================

update public.builder_referrals
set
  status = 'active',
  activated_at = coalesce(
    activated_at,
    now()
  )
where status = 'pending'
  and activated_at is null
  and created_at < '2026-08-09 00:00:00+00'::timestamptz;


-- ============================================================
-- 2. AUTHORITATIVE GALACTIC CHAIN REPAIR / BACKFILL
--
-- This runs AFTER all legacy referrals are active.
-- It guarantees that L2-L10 ancestry is complete regardless
-- of row ordering during the UPDATE above.
--
-- award_pending_network_gp() validates the real ancestry.
-- Existing Galactic Chain rows are protected by the same
-- idempotency key and cannot be duplicated.
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
    order by
      referral.activated_at asc,
      referral.referred_id asc
  loop

    for v_ancestor in
      with recursive ancestry as (
        select
          referral.referrer_id as ancestor_id,
          1 as depth
        from public.builder_referrals as referral
        where referral.referred_id = v_source.referred_id
          and referral.status = 'active'
          and referral.activated_at is not null

        union all

        select
          parent.referrer_id,
          ancestry.depth + 1
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
            'legacy_repair', true,
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

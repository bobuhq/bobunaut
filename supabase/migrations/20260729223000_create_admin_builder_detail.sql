begin;

create or replace function public.get_admin_builder_detail(
  p_builder_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_result jsonb;
begin
  if not public.has_admin_console_access() then
    raise exception 'Admin Console access required';
  end if;

  if p_builder_id is null then
    raise exception 'Builder ID is required';
  end if;

  select jsonb_build_object(
    'builderId',
    profile.builder_id,

    'profile',
    jsonb_build_object(
      'username', profile.username,
      'displayName', profile.display_name,
      'level', coalesce(profile.level, 1),
      'xp', coalesce(profile.xp, 0),
      'gp', coalesce(profile.gp, 0),
      'reputation', coalesce(profile.reputation, 0),
      'referralCount', coalesce(profile.referral_count, 0),
      'inviteCode', profile.invite_code,
      'createdAt', profile.created_at,
      'updatedAt', profile.updated_at
    ),

    'identity',
    jsonb_build_object(
      'telegram',
      coalesce((
        select bool_or(
          lower(identity.provider) = 'telegram'
          and identity.verified
        )
        from public.builder_social_identities as identity
        where identity.builder_id = profile.builder_id
      ), false),

      'x',
      coalesce((
        select bool_or(
          lower(identity.provider) = 'x'
          and identity.verified
        )
        from public.builder_social_identities as identity
        where identity.builder_id = profile.builder_id
      ), false),

      'instagram',
      coalesce((
        select bool_or(
          lower(identity.provider) = 'instagram'
          and identity.verified
        )
        from public.builder_social_identities as identity
        where identity.builder_id = profile.builder_id
      ), false),

      'wallet',
      coalesce((
        select bool_or(
          lower(identity.provider) = 'wallet'
          and identity.verified
        )
        from public.builder_social_identities as identity
        where identity.builder_id = profile.builder_id
      ), false)
    ),

    'wallet',
    jsonb_build_object(
      'currentGp',
      coalesce(profile.gp, 0),

      'lifetimeCredits',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
          and ledger.entry_type = 'credit'
      ), 0),

      'lifetimeDebits',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
          and ledger.entry_type = 'debit'
      ), 0),

      'lifetimeNet',
      coalesce((
        select sum(
          case
            when ledger.entry_type = 'credit'
              then ledger.amount
            when ledger.entry_type = 'debit'
              then -ledger.amount
            else 0
          end
        )
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
      ), 0),

      'socialGp',
      coalesce((
        select sum(
          case
            when ledger.entry_type = 'credit'
              then ledger.amount
            else 0
          end
        )
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
          and ledger.reward_type = 'social_verification'
      ), 0),

      'miningGp',
      coalesce((
        select sum(
          case
            when ledger.entry_type = 'credit'
              then ledger.amount
            else 0
          end
        )
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
          and lower(ledger.reward_type) like '%mining%'
      ), 0),

      'missionGp',
      coalesce((
        select sum(
          case
            when ledger.entry_type = 'credit'
              then ledger.amount
            else 0
          end
        )
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
          and lower(ledger.reward_type) like '%mission%'
      ), 0),

      'referralGp',
      coalesce((
        select sum(
          case
            when ledger.entry_type = 'credit'
              then ledger.amount
            else 0
          end
        )
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
          and lower(ledger.reward_type) like '%referral%'
      ), 0)
    ),

    'mining',
    jsonb_build_object(
      'active',
      exists(
        select 1
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
          and mining.status = 'active'
      ),

      'totalSessions',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
      ),

      'activeSessions',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
          and mining.status = 'active'
      ),

      'completedSessions',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
          and mining.status = 'completed'
      ),

      'claimedSessions',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
          and mining.status = 'claimed'
      ),

      'lifetimeRewardGp',
      coalesce((
        select sum(mining.reward_gp)
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
          and mining.status = 'claimed'
      ), 0),

      'lastClaimedAt',
      (
        select max(mining.claimed_at)
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
          and mining.claimed_at is not null
      )
    ),

    'referral',
    jsonb_build_object(
      'parentBuilderId',
      parent_profile.builder_id,

      'parentUsername',
      parent_profile.username,

      'parentDisplayName',
      parent_profile.display_name,

      'status',
      referral.status,

      'createdAt',
      referral.created_at,

      'directReferralCount',
      (
        select count(*)
        from public.builder_referrals as child_referral
        where child_referral.referrer_id = profile.builder_id
      )
    ),

    'recentLedger',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'ledgerId', recent.id,
          'rewardType', recent.reward_type,
          'provider', recent.provider,
          'entryType', recent.entry_type,
          'amount', recent.amount,
          'idempotencyKey', recent.idempotency_key,
          'metadata', recent.metadata,
          'createdAt', recent.created_at
        )
        order by recent.created_at desc
      )
      from (
        select ledger.*
        from public.builder_reward_ledger as ledger
        where ledger.builder_id = profile.builder_id
        order by ledger.created_at desc
        limit 10
      ) as recent
    ), '[]'::jsonb),

    'recentMining',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sessionId', recent.id,
          'status', recent.status,
          'startedAt', recent.started_at,
          'endsAt', recent.ends_at,
          'claimedAt', recent.claimed_at,
          'baseRatePerHour', recent.base_rate_per_hour,
          'referralBonusRate', recent.referral_bonus_rate,
          'totalRatePerHour', recent.total_rate_per_hour,
          'activeReferralCount', recent.active_referral_count,
          'rewardGp', recent.reward_gp,
          'ledgerId', recent.ledger_id
        )
        order by recent.started_at desc
      )
      from (
        select mining.*
        from public.builder_mining_sessions as mining
        where mining.builder_id = profile.builder_id
        order by mining.started_at desc
        limit 10
      ) as recent
    ), '[]'::jsonb)
  )
  into v_result
  from public.builder_profiles as profile

  left join public.builder_referrals as referral
    on referral.referred_id = profile.builder_id

  left join public.builder_profiles as parent_profile
    on parent_profile.builder_id = referral.referrer_id

  where profile.builder_id = p_builder_id;

  if v_result is null then
    raise exception 'Builder profile not found';
  end if;

  return v_result;
end;
$function$;

revoke all on function public.get_admin_builder_detail(uuid)
from public, anon;

grant execute on function public.get_admin_builder_detail(uuid)
to authenticated;

comment on function public.get_admin_builder_detail(uuid) is
'Returns read-only Builder profile, wallet, mining, referral and recent activity intelligence to authorized Admin Console users.';

commit;

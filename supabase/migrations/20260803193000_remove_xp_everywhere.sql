-- ============================================================
-- BOBU UNIVERSE
-- Permanent GP-only progression migration
--
-- Removes all active XP persistence and RPC contracts.
-- Historical migration files remain unchanged.
-- ============================================================

begin;


-- ============================================================
-- NEW BUILDER SIGNUP
-- Create the Builder profile and preferences without XP.
-- Preserve available identity metadata from email/OAuth signup.
-- ============================================================

create or replace function public.handle_new_builder()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_display_name text;
  v_username text;
begin
  v_display_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'display_name',
        new.raw_user_meta_data ->> 'builder_name',
        new.raw_user_meta_data ->> 'name',
        new.raw_user_meta_data ->> 'full_name',
        ''
      )
    ),
    ''
  );

  v_username := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'user_name',
        new.raw_user_meta_data ->> 'preferred_username',
        new.raw_user_meta_data ->> 'username',
        ''
      )
    ),
    ''
  );

  insert into public.builder_profiles (
    builder_id,
    username,
    display_name,
    level,
    gp,
    reputation,
    referral_count
  )
  values (
    new.id,
    v_username,
    v_display_name,
    1,
    0,
    0,
    0
  )
  on conflict (builder_id)
  do update set
    username = coalesce(
      public.builder_profiles.username,
      excluded.username
    ),
    display_name = coalesce(
      public.builder_profiles.display_name,
      excluded.display_name
    );

  insert into public.builder_preferences (
    builder_id
  )
  values (
    new.id
  )
  on conflict (builder_id)
  do nothing;

  return new;
end;
$function$;


-- ============================================================
-- ADMIN BUILDER INTELLIGENCE
-- PostgreSQL cannot replace a table-returning function when its
-- return shape changes, so drop and recreate it without XP.
-- ============================================================

drop function if exists public.get_admin_builder_intelligence(
  integer,
  integer,
  text
);

create or replace function public.get_admin_builder_intelligence(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null
)
returns table (
  builder_id uuid,
  username text,
  display_name text,
  level integer,
  gp bigint,
  reputation bigint,
  referral_count bigint,
  invite_code text,
  created_at timestamptz,
  mining_active boolean,
  telegram_verified boolean,
  x_verified boolean,
  instagram_verified boolean,
  wallet_verified boolean,
  verified boolean,
  genesis_builder boolean,
  passport_unlocked boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with base_builders as (
    select *
    from public.get_admin_builders(
      p_limit,
      p_offset,
      p_search
    )
  ),
  identity_status as (
    select
      identity.builder_id,

      bool_or(
        lower(identity.provider) = 'telegram'
        and identity.verified
      ) as telegram_verified,

      bool_or(
        lower(identity.provider) = 'x'
        and identity.verified
      ) as x_verified,

      bool_or(
        lower(identity.provider) = 'instagram'
        and identity.verified
      ) as instagram_verified,

      bool_or(
        lower(identity.provider) = 'wallet'
        and identity.verified
      ) as wallet_verified

    from public.builder_social_identities as identity
    group by identity.builder_id
  )
  select
    base.builder_id,
    base.username,
    base.display_name,
    base.level,
    base.gp,
    base.reputation,
    coalesce(base.referral_count, 0)::bigint,
    base.invite_code,
    base.created_at,
    base.mining_active,

    coalesce(status.telegram_verified, false),
    coalesce(status.x_verified, false),
    coalesce(status.instagram_verified, false),
    coalesce(status.wallet_verified, false),

    (
      coalesce(status.telegram_verified, false)
      and coalesce(status.x_verified, false)
    ) as verified,

    (
      coalesce(status.telegram_verified, false)
      and coalesce(status.x_verified, false)
    ) as genesis_builder,

    (
      coalesce(status.telegram_verified, false)
      and coalesce(status.x_verified, false)
    ) as passport_unlocked

  from base_builders as base

  left join identity_status as status
    on status.builder_id = base.builder_id;
$function$;

revoke all on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
) from public, anon;

grant execute on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
) to authenticated;

comment on function public.get_admin_builder_intelligence(
  integer,
  integer,
  text
) is
'Returns Builder progression, mining and verified identity information to authorized Admin Console users.';


-- ============================================================
-- ADMIN BUILDER DETAIL
-- Recreate the JSON response without an XP profile property.
-- ============================================================

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


-- ============================================================
-- PHYSICAL SCHEMA CLEANUP
-- Drop the obsolete Game Domain and Builder XP storage only after
-- every active function has been recreated without dependencies.
-- ============================================================

drop index if exists public.game_profiles_xp_idx;

alter table if exists public.game_profiles
  drop column if exists game_xp;

alter table if exists public.builder_profiles
  drop column if exists xp;


comment on table public.builder_profiles is
  'Canonical Builder profile using GP-only progression.';

comment on table public.game_profiles is
  'Game Domain profile without a separate experience-point system.';


commit;

begin;

-- ============================================================
-- BOBU UNIVERSE
-- Admin Analytics + Universe Health
-- ============================================================

create or replace function public.get_admin_analytics()
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

  select jsonb_build_object(
    'generatedAt',
    now(),

    'builders',
    jsonb_build_object(
      'total',
      (
        select count(*)
        from public.builder_profiles
      ),

      'today',
      (
        select count(*)
        from public.builder_profiles
        where created_at >= date_trunc('day', now())
      ),

      'week',
      (
        select count(*)
        from public.builder_profiles
        where created_at >= now() - interval '7 days'
      ),

      'month',
      (
        select count(*)
        from public.builder_profiles
        where created_at >= now() - interval '30 days'
      ),

      'previousMonth',
      (
        select count(*)
        from public.builder_profiles
        where created_at >= now() - interval '60 days'
          and created_at < now() - interval '30 days'
      )
    ),

    'gp',
    jsonb_build_object(
      'walletTotal',
      coalesce((
        select sum(profile.gp)
        from public.builder_profiles as profile
      ), 0),

      'creditsToday',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'credit'
          and ledger.created_at >= date_trunc('day', now())
      ), 0),

      'creditsWeek',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'credit'
          and ledger.created_at >= now() - interval '7 days'
      ), 0),

      'creditsMonth',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'credit'
          and ledger.created_at >= now() - interval '30 days'
      ), 0),

      'debitsMonth',
      coalesce((
        select sum(ledger.amount)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'debit'
          and ledger.created_at >= now() - interval '30 days'
      ), 0),

      'averageCredit',
      coalesce((
        select round(avg(ledger.amount)::numeric, 2)
        from public.builder_reward_ledger as ledger
        where ledger.entry_type = 'credit'
      ), 0)
    ),

    'mining',
    jsonb_build_object(
      'active',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.status = 'active'
          and mining.ends_at > now()
      ),

      'expired',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.status = 'active'
          and mining.ends_at <= now()
      ),

      'completed',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.status = 'completed'
      ),

      'claimed',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.status = 'claimed'
      ),

      'startedToday',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.started_at >= date_trunc('day', now())
      ),

      'claimedToday',
      (
        select count(*)
        from public.builder_mining_sessions as mining
        where mining.claimed_at >= date_trunc('day', now())
      ),

      'averageReward',
      coalesce((
        select round(avg(mining.reward_gp)::numeric, 2)
        from public.builder_mining_sessions as mining
      ), 0),

      'averageRate',
      coalesce((
        select round(
          avg(mining.total_rate_per_hour)::numeric,
          4
        )
        from public.builder_mining_sessions as mining
      ), 0)
    ),

    'verification',
    jsonb_build_object(
      'telegram',
      (
        select count(*)
        from public.builder_social_identities as identity
        where lower(identity.provider) = 'telegram'
          and identity.verified = true
      ),

      'x',
      (
        select count(*)
        from public.builder_social_identities as identity
        where lower(identity.provider) = 'x'
          and identity.verified = true
      ),

      'instagram',
      (
        select count(*)
        from public.builder_social_identities as identity
        where lower(identity.provider) = 'instagram'
          and identity.verified = true
      ),

      'wallet',
      (
        select count(*)
        from public.builder_social_identities as identity
        where lower(identity.provider) = 'wallet'
          and identity.verified = true
      ),

      'pending',
      (
        select count(*)
        from public.builder_social_identities as identity
        where identity.verified = false
      ),

      'fullyVerified',
      (
        select count(*)
        from (
          select identity.builder_id
          from public.builder_social_identities as identity
          where identity.verified = true
            and lower(identity.provider) in (
              'telegram',
              'x',
              'instagram'
            )
          group by identity.builder_id
          having count(
            distinct lower(identity.provider)
          ) = 3
        ) as verified_builder
      )
    ),

    'referrals',
    jsonb_build_object(
      'total',
      (
        select count(*)
        from public.builder_referrals
      ),

      'active',
      (
        select count(*)
        from public.builder_referrals
        where status = 'active'
      ),

      'pending',
      (
        select count(*)
        from public.builder_referrals
        where status = 'pending'
      ),

      'createdToday',
      (
        select count(*)
        from public.builder_referrals
        where created_at >= date_trunc('day', now())
      ),

      'largestNetwork',
      coalesce((
        select max(network.referral_total)
        from (
          select
            referral.referrer_id,
            count(*) as referral_total
          from public.builder_referrals as referral
          group by referral.referrer_id
        ) as network
      ), 0)
    ),

    'leaderboard',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'builderId', ranked.builder_id,
          'username', ranked.username,
          'displayName', ranked.display_name,
          'gp', ranked.gp,
          'level', ranked.level,
          'referralCount', ranked.referral_count
        )
        order by ranked.gp desc
      )
      from (
        select
          profile.builder_id,
          profile.username,
          profile.display_name,
          profile.gp,
          profile.level,
          coalesce(profile.referral_count, 0)
            as referral_count
        from public.builder_profiles as profile
        order by profile.gp desc, profile.created_at asc
        limit 5
      ) as ranked
    ), '[]'::jsonb),

    'builderTrend',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', trend.day,
          'value', trend.value
        )
        order by trend.day asc
      )
      from (
        select
          series.day::date as day,
          count(profile.builder_id) as value
        from generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as series(day)
        left join public.builder_profiles as profile
          on profile.created_at >= series.day
          and profile.created_at < series.day + interval '1 day'
        group by series.day
      ) as trend
    ), '[]'::jsonb),

    'gpTrend',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', trend.day,
          'value', trend.value
        )
        order by trend.day asc
      )
      from (
        select
          series.day::date as day,
          coalesce(sum(
            case
              when ledger.entry_type = 'credit'
                then ledger.amount
              else 0
            end
          ), 0) as value
        from generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as series(day)
        left join public.builder_reward_ledger as ledger
          on ledger.created_at >= series.day
          and ledger.created_at < series.day + interval '1 day'
        group by series.day
      ) as trend
    ), '[]'::jsonb),

    'miningTrend',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', trend.day,
          'value', trend.value
        )
        order by trend.day asc
      )
      from (
        select
          series.day::date as day,
          count(mining.id) as value
        from generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as series(day)
        left join public.builder_mining_sessions as mining
          on mining.started_at >= series.day
          and mining.started_at < series.day + interval '1 day'
        group by series.day
      ) as trend
    ), '[]'::jsonb),

    'health',
    jsonb_build_array(
      jsonb_build_object(
        'engine', 'API',
        'status', 'healthy',
        'detail', 'Admin analytics RPC responding'
      ),

      jsonb_build_object(
        'engine', 'Database',
        'status', 'healthy',
        'detail', 'Supabase data connection online'
      ),

      jsonb_build_object(
        'engine', 'Reward Engine',
        'status',
        case
          when to_regclass(
            'public.builder_reward_ledger'
          ) is not null then 'healthy'
          else 'offline'
        end,
        'detail', 'Immutable GP ledger'
      ),

      jsonb_build_object(
        'engine', 'Mining Engine',
        'status',
        case
          when to_regclass(
            'public.builder_mining_sessions'
          ) is not null then 'healthy'
          else 'offline'
        end,
        'detail', '24-hour server mining'
      ),

      jsonb_build_object(
        'engine', 'Identity Engine',
        'status',
        case
          when to_regclass(
            'public.builder_social_identities'
          ) is not null then 'healthy'
          else 'offline'
        end,
        'detail', 'Verified Builder identities'
      ),

      jsonb_build_object(
        'engine', 'Referral Engine',
        'status',
        case
          when to_regclass(
            'public.builder_referrals'
          ) is not null then 'healthy'
          else 'offline'
        end,
        'detail', 'Builder network attribution'
      ),

      jsonb_build_object(
        'engine', 'Wallet Engine',
        'status', 'planned',
        'detail', 'Dedicated wallet table not deployed'
      ),

      jsonb_build_object(
        'engine', 'Mission Engine',
        'status', 'planned',
        'detail', 'Mission persistence not deployed'
      )
    )
  )
  into v_result;

  return v_result;
end;
$function$;


-- ============================================================
-- EFFECTIVE ADMIN MINING STATUS
-- Expired is derived from server time without mutating history.
-- ============================================================

drop function if exists public.get_admin_mining_sessions(
  integer,
  integer,
  text,
  text
);

create function public.get_admin_mining_sessions(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default null,
  p_status text default null
)
returns table (
  session_id uuid,
  builder_id uuid,
  username text,
  display_name text,
  status text,
  started_at timestamptz,
  ends_at timestamptz,
  claimed_at timestamptz,
  base_rate_per_hour numeric,
  active_referral_count bigint,
  referral_bonus_rate numeric,
  total_rate_per_hour numeric,
  reward_gp bigint,
  ledger_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  remaining_seconds bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with mining_rows as (
    select
      session.id as session_id,
      session.builder_id,
      profile.username,
      profile.display_name,

      case
        when session.status = 'active'
          and session.ends_at <= now()
          then 'expired'
        else session.status
      end as effective_status,

      session.started_at,
      session.ends_at,
      session.claimed_at,
      session.base_rate_per_hour,
      session.active_referral_count,
      session.referral_bonus_rate,
      session.total_rate_per_hour,
      session.reward_gp,
      session.ledger_id,
      session.created_at,
      session.updated_at,

      greatest(
        floor(
          extract(
            epoch from session.ends_at - now()
          )
        )::bigint,
        0
      ) as remaining_seconds

    from public.builder_mining_sessions as session

    join public.builder_profiles as profile
      on profile.builder_id = session.builder_id
  )

  select
    row.session_id,
    row.builder_id,
    row.username,
    row.display_name,
    row.effective_status,
    row.started_at,
    row.ends_at,
    row.claimed_at,
    row.base_rate_per_hour,
    row.active_referral_count,
    row.referral_bonus_rate,
    row.total_rate_per_hour,
    row.reward_gp,
    row.ledger_id,
    row.created_at,
    row.updated_at,
    row.remaining_seconds

  from mining_rows as row

  where public.has_admin_console_access()

    and (
      nullif(trim(p_search), '') is null
      or row.username ilike
        '%' || trim(p_search) || '%'
      or row.display_name ilike
        '%' || trim(p_search) || '%'
      or row.builder_id::text ilike
        '%' || trim(p_search) || '%'
      or row.session_id::text ilike
        '%' || trim(p_search) || '%'
    )

    and (
      nullif(trim(p_status), '') is null
      or row.effective_status =
        lower(trim(p_status))
    )

  order by row.created_at desc

  limit least(
    greatest(coalesce(p_limit, 25), 1),
    100
  )

  offset greatest(coalesce(p_offset, 0), 0);
$function$;


revoke all
on function public.get_admin_analytics()
from public, anon;

revoke all
on function public.get_admin_mining_sessions(
  integer,
  integer,
  text,
  text
)
from public, anon;

grant execute
on function public.get_admin_analytics()
to authenticated;

grant execute
on function public.get_admin_mining_sessions(
  integer,
  integer,
  text,
  text
)
to authenticated;

comment on function public.get_admin_analytics() is
'Returns authorized Builder, GP, mining, verification, referral, trend, leaderboard and Universe Health analytics.';

commit;

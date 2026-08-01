-- ============================================================
-- BOBU UNIVERSE
-- Builder Mining Streak Read Model
--
-- Calculates streak and lifetime mining statistics from
-- server-authoritative claimed mining sessions.
-- ============================================================

begin;

create or replace function public.get_my_mining_streak()
returns table (
  current_streak_days bigint,
  best_streak_days bigint,
  total_claimed_sessions bigint,
  lifetime_mined_gp bigint,
  last_claimed_at timestamptz,
  streak_active_today boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with authenticated_builder as (
    select auth.uid() as builder_id
  ),

  claimed_sessions as (
    select
      mining.id,
      mining.reward_gp,
      mining.claimed_at,
      mining.ends_at,
      (mining.ends_at at time zone 'UTC')::date
        as mining_day
    from public.builder_mining_sessions as mining
    join authenticated_builder as auth_builder
      on auth_builder.builder_id = mining.builder_id
    where auth_builder.builder_id is not null
      and mining.status = 'claimed'
      and mining.claimed_at is not null
  ),

  distinct_days as (
    select distinct
      session.mining_day
    from claimed_sessions as session
  ),

  numbered_days as (
    select
      day.mining_day,
      row_number() over (
        order by day.mining_day
      ) as row_number
    from distinct_days as day
  ),

  streak_groups as (
    select
      numbered.mining_day,
      numbered.mining_day
        - numbered.row_number::integer
        as streak_group
    from numbered_days as numbered
  ),

  streak_lengths as (
    select
      streak.streak_group,
      min(streak.mining_day) as streak_start,
      max(streak.mining_day) as streak_end,
      count(*)::bigint as streak_days
    from streak_groups as streak
    group by streak.streak_group
  ),

  aggregate_stats as (
    select
      count(*)::bigint as total_claimed_sessions,
      coalesce(
        sum(session.reward_gp),
        0
      )::bigint as lifetime_mined_gp,
      max(session.claimed_at) as last_claimed_at
    from claimed_sessions as session
  ),

  day_stats as (
    select
      max(day.mining_day) as latest_mining_day,
      exists (
        select 1
        from distinct_days as today_day
        where today_day.mining_day =
          (now() at time zone 'UTC')::date
      ) as streak_active_today
    from distinct_days as day
  ),

  current_streak as (
    select
      coalesce(
        max(lengths.streak_days)
          filter (
            where lengths.streak_end =
              day_stats.latest_mining_day
              and day_stats.latest_mining_day >=
                (now() at time zone 'UTC')::date - 1
          ),
        0
      )::bigint as current_streak_days
    from streak_lengths as lengths
    cross join day_stats
  ),

  best_streak as (
    select
      coalesce(
        max(lengths.streak_days),
        0
      )::bigint as best_streak_days
    from streak_lengths as lengths
  )

  select
    current_streak.current_streak_days,
    best_streak.best_streak_days,
    aggregate_stats.total_claimed_sessions,
    aggregate_stats.lifetime_mined_gp,
    aggregate_stats.last_claimed_at,
    day_stats.streak_active_today
  from current_streak
  cross join best_streak
  cross join aggregate_stats
  cross join day_stats;
$function$;

revoke all
on function public.get_my_mining_streak()
from public, anon;

grant execute
on function public.get_my_mining_streak()
to authenticated;

comment on function public.get_my_mining_streak() is
  'Returns authenticated Builder mining streak and lifetime statistics calculated from claimed server-authoritative mining sessions. Mining days use UTC session completion dates.';

commit;

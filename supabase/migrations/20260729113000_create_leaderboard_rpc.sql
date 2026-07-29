begin;

-- ============================================================
-- BOBU UNIVERSE
-- Global Builder Leaderboard
--
-- Source of truth:
--   public.builder_profiles.gp
--
-- These functions are read-only.
-- They do not calculate, award or modify GP.
-- ============================================================


-- ============================================================
-- GLOBAL LEADERBOARD
-- ============================================================

create or replace function public.get_global_leaderboard(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  rank bigint,
  builder_id uuid,
  username text,
  display_name text,
  level integer,
  gp bigint,
  reputation bigint,
  referral_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked_builders as (
    select
      row_number() over (
        order by
          profile.gp desc,
          profile.level desc,
          profile.reputation desc,
          profile.created_at asc,
          profile.builder_id asc
      ) as rank,
      profile.builder_id,
      profile.username,
      profile.display_name,
      profile.level,
      profile.gp,
      profile.reputation,
      profile.referral_count
    from public.builder_profiles as profile
  )
  select
    ranked.rank,
    ranked.builder_id,
    ranked.username,
    ranked.display_name,
    ranked.level,
    ranked.gp,
    ranked.reputation,
    ranked.referral_count
  from ranked_builders as ranked
  order by ranked.rank
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


-- ============================================================
-- CURRENT BUILDER RANK
-- Returns only the authenticated Builder's position.
-- ============================================================

create or replace function public.get_my_leaderboard_rank()
returns table (
  rank bigint,
  builder_id uuid,
  username text,
  display_name text,
  level integer,
  gp bigint,
  reputation bigint,
  referral_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked_builders as (
    select
      row_number() over (
        order by
          profile.gp desc,
          profile.level desc,
          profile.reputation desc,
          profile.created_at asc,
          profile.builder_id asc
      ) as rank,
      profile.builder_id,
      profile.username,
      profile.display_name,
      profile.level,
      profile.gp,
      profile.reputation,
      profile.referral_count
    from public.builder_profiles as profile
  )
  select
    ranked.rank,
    ranked.builder_id,
    ranked.username,
    ranked.display_name,
    ranked.level,
    ranked.gp,
    ranked.reputation,
    ranked.referral_count
  from ranked_builders as ranked
  where ranked.builder_id = auth.uid();
$$;


-- ============================================================
-- FUNCTION PERMISSIONS
-- Leaderboard is available only to authenticated Builders.
-- ============================================================

revoke all on function public.get_global_leaderboard(integer, integer)
from public;

revoke all on function public.get_my_leaderboard_rank()
from public;

grant execute on function public.get_global_leaderboard(integer, integer)
to authenticated;

grant execute on function public.get_my_leaderboard_rank()
to authenticated;

commit;

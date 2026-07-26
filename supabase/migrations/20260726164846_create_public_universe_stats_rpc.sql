begin;

create or replace function public.get_public_universe_stats()
returns table (
  builders_joined bigint,
  galaxies_created bigint,
  alliances_formed bigint,
  gp_generated bigint,
  new_builders_this_week bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.builder_profiles
    )::bigint as builders_joined,

    (
      select count(*)
      from public.builder_profiles
      where referral_count > 0
    )::bigint as galaxies_created,

    0::bigint as alliances_formed,

    (
      select coalesce(sum(gp), 0)
      from public.builder_profiles
    )::bigint as gp_generated,

    (
      select count(*)
      from public.builder_profiles
      where created_at >= now() - interval '7 days'
    )::bigint as new_builders_this_week;
$$;

revoke all on function public.get_public_universe_stats() from public;
grant execute on function public.get_public_universe_stats() to anon;
grant execute on function public.get_public_universe_stats() to authenticated;

comment on function public.get_public_universe_stats() is
'Returns aggregate public BOBU Universe statistics without exposing Builder profile data. Alliances remain zero until the alliance system is implemented.';

commit;

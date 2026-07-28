begin;

drop function if exists public.get_my_galaxy();

create function public.get_my_galaxy()
returns table (
  builder_id uuid,
  parent_builder_id uuid,
  username text,
  display_name text,
  level integer,
  gp bigint,
  referral_count bigint,
  referral_status text,
  joined_at timestamptz,
  depth integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_builder_id uuid;
begin
  v_builder_id := auth.uid();

  if v_builder_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  with recursive galaxy_tree as (
    select
      referral.referred_id as builder_id,
      referral.referrer_id as parent_builder_id,
      referral.status as referral_status,
      referral.created_at as joined_at,
      1 as depth,
      array[
        referral.referrer_id,
        referral.referred_id
      ]::uuid[] as visited
    from public.builder_referrals as referral
    where referral.referrer_id = v_builder_id
      and referral.status in ('pending', 'active')

    union all

    select
      child.referred_id as builder_id,
      child.referrer_id as parent_builder_id,
      child.status as referral_status,
      child.created_at as joined_at,
      tree.depth + 1 as depth,
      tree.visited || child.referred_id
    from public.builder_referrals as child
    join galaxy_tree as tree
      on child.referrer_id = tree.builder_id
    where child.status in ('pending', 'active')
      and not child.referred_id = any(tree.visited)
      and tree.depth < 10
  )
  select
    profile.builder_id,
    tree.parent_builder_id,
    profile.username,
    profile.display_name,
    profile.level,
    profile.gp,
    profile.referral_count,
    tree.referral_status,
    tree.joined_at,
    tree.depth
  from galaxy_tree as tree
  join public.builder_profiles as profile
    on profile.builder_id = tree.builder_id
  order by
    tree.depth asc,
    tree.joined_at asc;
end;
$$;

revoke all on function public.get_my_galaxy() from public;
grant execute on function public.get_my_galaxy() to authenticated;

comment on function public.get_my_galaxy() is
'Returns the authenticated Builder complete referral Galaxy tree with parent relationship and depth.';

commit;

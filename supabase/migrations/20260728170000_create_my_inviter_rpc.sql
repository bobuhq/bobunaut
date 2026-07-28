begin;

create or replace function public.get_my_inviter()
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
  select
    profile.builder_id,
    referral.referrer_id as parent_builder_id,
    profile.username,
    profile.display_name,
    profile.level,
    profile.gp,
    profile.referral_count,
    referral.status as referral_status,
    referral.created_at as joined_at,
    -1 as depth
  from public.builder_referrals as referral
  join public.builder_profiles as profile
    on profile.builder_id = referral.referrer_id
  where referral.referred_id = v_builder_id
    and referral.status in ('pending', 'active')
  order by referral.created_at asc
  limit 1;
end;
$$;

revoke all on function public.get_my_inviter() from public;
grant execute on function public.get_my_inviter() to authenticated;

comment on function public.get_my_inviter() is
'Returns only the Builder who invited the authenticated Builder.';

commit;

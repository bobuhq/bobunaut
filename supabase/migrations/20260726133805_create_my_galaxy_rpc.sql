begin;

alter table public.builder_referrals
enable row level security;

create or replace function public.get_my_galaxy()
returns table (
  builder_id uuid,
  username text,
  display_name text,
  level integer,
  gp bigint,
  referral_count bigint,
  referral_status text,
  joined_at timestamptz
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
    profile.username,
    profile.display_name,
    profile.level,
    profile.gp,
    profile.referral_count,
    referral.status,
    referral.created_at
  from public.builder_referrals as referral
  join public.builder_profiles as profile
    on profile.builder_id = referral.referred_id
  where referral.referrer_id = v_builder_id
    and referral.status in ('pending', 'active')
  order by referral.created_at asc;
end;
$$;

revoke all on function public.get_my_galaxy() from public;
grant execute on function public.get_my_galaxy() to authenticated;

comment on function public.get_my_galaxy() is
'Returns only the authenticated Builder direct Galaxy connections with pending or active status.';

commit;

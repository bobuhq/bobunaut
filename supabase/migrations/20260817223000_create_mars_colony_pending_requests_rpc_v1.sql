begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Colony Pending Requests RPC v1
--
-- Founder / Leader only.
-- Read-only.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.get_my_mars_colony_join_requests()
returns table (
  membership_id uuid,
  colony_id uuid,
  colony_code text,
  colony_name text,
  builder_id uuid,
  membership_role text,
  membership_status text,
  requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
  v_colony_id uuid;
begin
  if v_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    where bp.builder_id = v_builder_id
  ) then
    raise exception 'BUILDER_PROFILE_REQUIRED'
      using errcode = '42501';
  end if;

  select m.colony_id
  into v_colony_id
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = v_builder_id
    and m.status = 'active'
    and m.role in ('founder', 'leader')
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'COLONY_MANAGEMENT_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    m.id,
    c.id,
    c.colony_code,
    c.name,
    m.builder_id,
    m.role,
    m.status,
    m.created_at
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.colony_id = v_colony_id
    and m.status = 'requested'
  order by m.created_at asc;
end;
$$;

revoke all
on function public.get_my_mars_colony_join_requests()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_join_requests()
to authenticated;

comment on function public.get_my_mars_colony_join_requests() is
'Returns pending join requests for the authenticated Founder or Leader active Mars Colony. Read-only.';

commit;

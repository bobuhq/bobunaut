begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — My Colony Members RPC v1
--
-- Returns active members of the authenticated Builder's
-- active Mars Colony.
--
-- Read-only.
-- No direct table SELECT permission required.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.get_my_mars_colony_members()
returns table (
  membership_id uuid,
  colony_id uuid,
  builder_id uuid,
  username text,
  display_name text,
  membership_role text,
  membership_status text,
  joined_at timestamptz
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

  -- Resolve Colony exclusively from authenticated Builder's
  -- active membership. Client cannot choose another Colony.
  select m.colony_id
  into v_colony_id
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = v_builder_id
    and m.status = 'active'
    and c.status = 'active'
  limit 1;

  if v_colony_id is null then
    raise exception 'ACTIVE_COLONY_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.colony_id,
    m.builder_id,
    bp.username,
    bp.display_name,
    m.role,
    m.status,
    m.joined_at
  from public.mars_colony_memberships m
  join public.builder_profiles bp
    on bp.builder_id = m.builder_id
  where m.colony_id = v_colony_id
    and m.status = 'active'
  order by
    case m.role
      when 'founder' then 1
      when 'leader' then 2
      when 'officer' then 3
      when 'member' then 4
      else 5
    end,
    m.joined_at asc nulls last,
    m.created_at asc;
end;
$$;


revoke all
on function public.get_my_mars_colony_members()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_members()
to authenticated;

comment on function public.get_my_mars_colony_members() is
'Returns active members of the authenticated Builder active Mars Colony with public Builder identity fields. Read-only.';

commit;

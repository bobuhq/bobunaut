begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — My Colony Read RPC v2
--
-- ADD-ONLY.
-- Extends authenticated Colony read model with the current
-- active Mars Sector assignment.
--
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.get_my_mars_colony_v2()
returns table (
  colony_id uuid,
  colony_code text,
  colony_name text,
  specialization text,
  colony_status text,
  member_count bigint,
  total_contribution bigint,

  my_role text,
  membership_status text,
  joined_at timestamptz,

  founder_builder_id uuid,
  leader_builder_id uuid,

  active_sector_id uuid,
  active_sector_code text,
  active_sector_name text,
  active_sector_status text,
  sector_assigned_at timestamptz,

  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.colony_code,
    c.name,
    c.specialization,
    c.status,
    c.member_count,
    c.total_contribution,

    m.role,
    m.status,
    m.joined_at,

    c.founder_builder_id,
    c.leader_builder_id,

    sector.id,
    sector.sector_code,
    sector.name,
    assignment.status,
    assignment.assigned_at,

    c.created_at

  from public.mars_colony_memberships membership_source

  join public.mars_colony_memberships m
    on m.id = membership_source.id

  join public.mars_colonies c
    on c.id = m.colony_id

  left join public.mars_colony_sector_assignments assignment
    on assignment.colony_id = c.id
   and assignment.status = 'active'

  left join public.mars_sectors sector
    on sector.id = assignment.sector_id

  where m.builder_id = auth.uid()
    and m.status = 'active'
    and c.status = 'active'

  limit 1;
$$;

revoke all
on function public.get_my_mars_colony_v2()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony_v2()
to authenticated;

comment on function public.get_my_mars_colony_v2() is
'Returns the authenticated Builder active Mars Colony, membership role, and current active Mars Sector. Read-only.';

commit;

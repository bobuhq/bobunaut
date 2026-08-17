begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — My Colony Read RPC v1
--
-- Read-only authenticated Colony view.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.get_my_mars_colony()
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

  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id as colony_id,
    c.colony_code,
    c.name as colony_name,
    c.specialization,
    c.status as colony_status,
    c.member_count,
    c.total_contribution,

    m.role as my_role,
    m.status as membership_status,
    m.joined_at,

    c.founder_builder_id,
    c.leader_builder_id,

    c.created_at

  from public.mars_colony_memberships m

  join public.mars_colonies c
    on c.id = m.colony_id

  where m.builder_id = auth.uid()
    and m.status = 'active'

  limit 1;
$$;

revoke all
on function public.get_my_mars_colony()
from public, anon, authenticated;

grant execute
on function public.get_my_mars_colony()
to authenticated;

comment on function public.get_my_mars_colony() is
'Returns the authenticated Builder active Mars Colony and membership role. Read-only.';

commit;

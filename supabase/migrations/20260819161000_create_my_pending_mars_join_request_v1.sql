begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — My Pending Join Request v1
--
-- Authenticated Builder can read their own current pending
-- Colony join request.
--
-- Read-only.
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.get_my_pending_mars_colony_join_request()
returns table (
  membership_id uuid,
  colony_id uuid,
  colony_code text,
  colony_name text,
  specialization text,
  membership_status text,
  requested_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.id,
    c.id,
    c.colony_code,
    c.name,
    c.specialization,
    m.status,
    m.created_at
  from public.mars_colony_memberships m
  join public.mars_colonies c
    on c.id = m.colony_id
  where m.builder_id = auth.uid()
    and m.status = 'requested'
    and c.status = 'active'
  order by m.created_at desc
  limit 1;
$$;

revoke all
on function public.get_my_pending_mars_colony_join_request()
from public, anon, authenticated;

grant execute
on function public.get_my_pending_mars_colony_join_request()
to authenticated;

comment on function public.get_my_pending_mars_colony_join_request() is
'Returns the authenticated Builder current pending Mars Colony join request. Read-only.';

commit;

-- ============================================================
-- BOBU UNIVERSE
-- Network GP Balance Read Model
--
-- Authenticated Builders may read only their own Personal,
-- Pending Network, Eligible Network and Total GP balances.
-- No browser-side mutation capability is introduced here.
-- ============================================================

create or replace function public.get_my_network_gp_balances()
returns table (
  personal_gp bigint,
  pending_network_gp bigint,
  eligible_network_gp bigint,
  total_gp bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_builder_id uuid := auth.uid();
begin
  if v_builder_id is null then
    raise exception 'Authentication is required';
  end if;

  insert into public.builder_profiles (
    builder_id
  )
  values (
    v_builder_id
  )
  on conflict (builder_id) do nothing;

  return query
  select
    profile.personal_gp,
    profile.pending_network_gp,
    profile.eligible_network_gp,
    profile.gp
  from public.builder_profiles as profile
  where profile.builder_id = v_builder_id;
end;
$$;

revoke all
on function public.get_my_network_gp_balances()
from public, anon;

grant execute
on function public.get_my_network_gp_balances()
to authenticated, service_role;

comment on function public.get_my_network_gp_balances() is
  'Returns the authenticated Builder Personal GP, Pending Network GP, Eligible Network GP and Total GP balances.';

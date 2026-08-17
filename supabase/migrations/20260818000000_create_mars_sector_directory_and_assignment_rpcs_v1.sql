begin;

-- ============================================================
-- BOBU UNIVERSE
-- BUILD MARS — Sector Directory + Assignment RPCs v1
--
-- Authenticated Builders may read active Sectors.
-- Colony Leader may assign own active Colony to one Sector.
--
-- No GP / Mining / Referral / Wallet side effects.
-- ============================================================

create or replace function public.get_mars_sector_directory()
returns table (
  sector_id uuid,
  sector_code text,
  sector_name text,
  sector_status text,
  max_colonies bigint,
  current_colonies bigint,
  total_contribution bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.sector_code,
    s.name,
    s.status,
    s.max_colonies,
    s.current_colonies,
    s.total_contribution
  from public.mars_sectors s
  where auth.uid() is not null
    and s.status = 'active'
  order by
    s.current_colonies asc,
    s.name asc;
$$;

revoke all
on function public.get_mars_sector_directory()
from public, anon, authenticated;

grant execute
on function public.get_mars_sector_directory()
to authenticated;


create or replace function public.assign_my_colony_to_mars_sector(
  p_sector_id uuid
)
returns table (
  assignment_id uuid,
  colony_id uuid,
  colony_name text,
  sector_id uuid,
  sector_name text,
  assignment_status text,
  assigned_at timestamptz,
  sector_current_colonies bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_builder_id uuid := auth.uid();

  v_colony_id uuid;
  v_colony_name text;

  v_sector_name text;
  v_sector_status text;
  v_sector_max_colonies bigint;
  v_sector_current_colonies bigint;

  v_assignment_id uuid;
  v_assigned_at timestamptz := now();
begin
  if v_actor_builder_id is null then
    raise exception 'AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_sector_id is null then
    raise exception 'SECTOR_REQUIRED'
      using errcode = '22023';
  end if;

  select
    c.id,
    c.name
  into
    v_colony_id,
    v_colony_name
  from public.mars_colonies c
  where c.leader_builder_id = v_actor_builder_id
    and c.status = 'active'
  limit 1
  for update;

  if v_colony_id is null then
    raise exception 'COLONY_LEADER_REQUIRED'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.mars_colony_sector_assignments assignment
    where assignment.colony_id = v_colony_id
      and assignment.status = 'active'
  ) then
    raise exception 'ACTIVE_SECTOR_ALREADY_ASSIGNED'
      using errcode = '23505';
  end if;

  select
    sector.name,
    sector.status,
    sector.max_colonies,
    sector.current_colonies
  into
    v_sector_name,
    v_sector_status,
    v_sector_max_colonies,
    v_sector_current_colonies
  from public.mars_sectors sector
  where sector.id = p_sector_id
  for update;

  if v_sector_name is null then
    raise exception 'SECTOR_NOT_FOUND'
      using errcode = '22023';
  end if;

  if v_sector_status <> 'active' then
    raise exception 'SECTOR_NOT_AVAILABLE'
      using errcode = '22023';
  end if;

  if v_sector_current_colonies >= v_sector_max_colonies then
    raise exception 'SECTOR_CAPACITY_REACHED'
      using errcode = '23505';
  end if;

  insert into public.mars_colony_sector_assignments (
    colony_id,
    sector_id,
    status,
    assigned_at,
    created_at,
    updated_at
  )
  values (
    v_colony_id,
    p_sector_id,
    'active',
    v_assigned_at,
    v_assigned_at,
    v_assigned_at
  )
  returning id
  into v_assignment_id;

  update public.mars_sectors as sector
  set
    current_colonies = sector.current_colonies + 1,
    updated_at = v_assigned_at
  where sector.id = p_sector_id
  returning sector.current_colonies
  into v_sector_current_colonies;

  insert into public.mars_colony_history (
    colony_id,
    event_type,
    event_key,
    actor_builder_id,
    subject_builder_id,
    title,
    description,
    metadata,
    created_at
  )
  values (
    v_colony_id,
    'sector_assigned',
    'sector_assigned:' || v_assignment_id::text,
    v_actor_builder_id,
    v_actor_builder_id,
    'Colony Assigned to Mars Sector',
    v_colony_name || ' established operations in ' ||
      v_sector_name || '.',
    jsonb_build_object(
      'assignment_id', v_assignment_id,
      'sector_id', p_sector_id,
      'sector_name', v_sector_name
    ),
    v_assigned_at
  );

  return query
  select
    v_assignment_id,
    v_colony_id,
    v_colony_name,
    p_sector_id,
    v_sector_name,
    'active'::text,
    v_assigned_at,
    v_sector_current_colonies;
end;
$$;


revoke all
on function public.assign_my_colony_to_mars_sector(uuid)
from public, anon, authenticated;

grant execute
on function public.assign_my_colony_to_mars_sector(uuid)
to authenticated;


comment on function public.get_mars_sector_directory() is
'Returns active BUILD MARS Sectors to authenticated Builders. Read-only.';

comment on function public.assign_my_colony_to_mars_sector(uuid) is
'Assigns the authenticated Leader active Mars Colony to one available Sector. Updates Sector population atomically. Awards no GP.';

commit;

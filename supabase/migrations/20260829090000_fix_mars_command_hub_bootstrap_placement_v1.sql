-- BOBU Mars
-- Command Hub Bootstrap Placement V1
--
-- Every newly created real Colony starts with exactly one
-- active Level 1 Command Hub at the deterministic origin.
--
-- This keeps new-colony bootstrap compatible with the
-- server-authoritative Mars Placement Engine and Command Hub
-- progression bounds.

create or replace function public.bootstrap_mars_colony_command_hub()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.mars_colony_buildings (
    colony_id,
    building_key,
    level,
    status,
    grid_x,
    grid_z,
    rotation_y,
    constructed_at,
    updated_at
  )
  values (
    new.id,
    'command_hub',
    1,
    'active',
    0,
    0,
    0,
    new.created_at,
    new.created_at
  )
  on conflict (colony_id, building_key)
  do nothing;

  return new;
end;
$$;

comment on function public.bootstrap_mars_colony_command_hub() is
'Bootstraps every newly created Mars Colony with exactly one active Level 1 Command Hub at authoritative grid origin (0,0).';

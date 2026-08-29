begin;

-- ============================================================
-- BOBU MARS
-- Bobu Genesis Progression Start Reset V1
--
-- One-time production normalization for the existing
-- Bobu Genesis Colony only.
--
-- Historical Colony events and resource ledger entries are
-- intentionally preserved.
-- ============================================================

do $$
declare
  v_colony_id constant uuid :=
    '4e7e19d7-ba4c-42eb-9466-50f84fe38b65';
  v_command_hub_count integer;
begin
  select count(*)
  into v_command_hub_count
  from public.mars_colony_buildings
  where colony_id = v_colony_id
    and building_key = 'command_hub'
    and status <> 'archived';

  if v_command_hub_count <> 1 then
    raise exception
      'BOBU_GENESIS_COMMAND_HUB_INVARIANT_FAILED: expected 1 active Command Hub, found %',
      v_command_hub_count;
  end if;

  update public.mars_colony_buildings
  set
    status = 'archived',
    updated_at = now()
  where colony_id = v_colony_id
    and building_key <> 'command_hub'
    and status <> 'archived';

  update public.mars_colony_buildings
  set
    level = 1,
    status = 'active',
    grid_x = 0,
    grid_z = 0,
    rotation_y = 0,
    updated_at = now()
  where colony_id = v_colony_id
    and building_key = 'command_hub'
    and status <> 'archived';

  update public.mars_colony_inventory
  set
    quantity = 0,
    updated_at = now()
  where colony_id = v_colony_id
    and quantity <> 0;
end;
$$;

commit;

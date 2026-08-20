begin;

-- ============================================================
-- BOBU Universe
-- Mars Mission Catalog V1
--
-- Production mission definitions for real Mars actions.
--
-- Important:
--   mission_progress cycle_key = lifetime
--   Game Core cadence        = one_time
--
-- These are intentionally separate concepts.
-- ============================================================


-- ------------------------------------------------------------
-- Mission rewards
-- ------------------------------------------------------------

insert into public.mission_reward_catalog (
  mission_id,
  reward_gp,
  enabled
)
values
  (
    'mars-create-colony',
    500,
    true
  ),
  (
    'mars-assign-sector',
    250,
    true
  ),
  (
    'mars-construct-building',
    300,
    true
  ),
  (
    'mars-upgrade-building',
    400,
    true
  ),
  (
    'mars-claim-resources',
    150,
    true
  )
on conflict (mission_id)
do update set
  reward_gp = excluded.reward_gp,
  enabled = excluded.enabled,
  updated_at = now();


-- ------------------------------------------------------------
-- Mars action -> mission progress mappings
-- ------------------------------------------------------------

insert into public.mars_mission_progress_catalog (
  mission_id,
  mars_event_type,
  target,
  cycle_key,
  enabled
)
values
  (
    'mars-create-colony',
    'COLONY_CREATED',
    1,
    'lifetime',
    true
  ),
  (
    'mars-assign-sector',
    'SECTOR_ASSIGNED',
    1,
    'lifetime',
    true
  ),
  (
    'mars-construct-building',
    'BUILDING_CONSTRUCTED',
    1,
    'lifetime',
    true
  ),
  (
    'mars-upgrade-building',
    'BUILDING_UPGRADED',
    1,
    'lifetime',
    true
  ),
  (
    'mars-claim-resources',
    'RESOURCES_CLAIMED',
    1,
    'lifetime',
    true
  )
on conflict (mission_id)
do update set
  mars_event_type = excluded.mars_event_type,
  target = excluded.target,
  cycle_key = excluded.cycle_key,
  enabled = excluded.enabled,
  updated_at = now();


-- ------------------------------------------------------------
-- Mars mission -> civilization contribution mappings
-- ------------------------------------------------------------

insert into public.mars_mission_contribution_catalog (
  mission_id,
  contribution_type,
  contribution_amount,
  enabled
)
values
  (
    'mars-create-colony',
    'general',
    500,
    true
  ),
  (
    'mars-assign-sector',
    'exploration',
    250,
    true
  ),
  (
    'mars-construct-building',
    'general',
    300,
    true
  ),
  (
    'mars-upgrade-building',
    'general',
    400,
    true
  ),
  (
    'mars-claim-resources',
    'general',
    150,
    true
  )
on conflict (mission_id)
do update set
  contribution_type =
    excluded.contribution_type,
  contribution_amount =
    excluded.contribution_amount,
  enabled = excluded.enabled,
  updated_at = now();


commit;

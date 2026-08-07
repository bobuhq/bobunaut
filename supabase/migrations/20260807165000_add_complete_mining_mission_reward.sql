-- ============================================================
-- BOBU UNIVERSE
-- Complete Mining Daily Mission Reward
-- ============================================================

insert into public.mission_reward_catalog (
  mission_id,
  reward_gp,
  enabled
)
values (
  'complete-mining',
  150,
  true
)
on conflict (mission_id)
do update
set
  reward_gp = excluded.reward_gp,
  enabled = excluded.enabled,
  updated_at = now();

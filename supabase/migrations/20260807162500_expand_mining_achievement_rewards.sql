-- ============================================================
-- BOBU UNIVERSE
-- Mining Achievement Reward Catalog v1
-- ============================================================

insert into public.achievement_reward_catalog (
  achievement_id,
  reward_gp,
  enabled
)
values
  (
    'three-mining-sessions',
    250,
    true
  ),
  (
    'seven-mining-sessions',
    500,
    true
  ),
  (
    'thirty-mining-sessions',
    2000,
    true
  )
on conflict (achievement_id)
do update
set
  reward_gp = excluded.reward_gp,
  enabled = excluded.enabled,
  updated_at = now();

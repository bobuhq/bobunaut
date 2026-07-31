import {
  defineAchievementCatalog,
} from "../rules";

export const achievementCatalog =
  defineAchievementCatalog([
    {
      id: "first-mining-session",
      title: "First Mining Session",
      description: "Start your first mining session.",
      eventType: "MINING_STARTED",
      target: 1,
      reward: {
        gp: 100,
      },
    },
  ]);

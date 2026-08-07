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
    {
      id: "three-mining-sessions",
      title: "Mining Momentum",
      description: "Complete and claim 3 verified mining sessions.",
      eventType: "MINING_CLAIMED",
      target: 3,
      reward: {
        gp: 250,
      },
    },
    {
      id: "seven-mining-sessions",
      title: "Seven-Day Miner",
      description: "Complete and claim 7 verified mining sessions.",
      eventType: "MINING_CLAIMED",
      target: 7,
      reward: {
        gp: 500,
      },
    },
    {
      id: "thirty-mining-sessions",
      title: "Mining Veteran",
      description: "Complete and claim 30 verified mining sessions.",
      eventType: "MINING_CLAIMED",
      target: 30,
      reward: {
        gp: 2000,
      },
    },
  ]);

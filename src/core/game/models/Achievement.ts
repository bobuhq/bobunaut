export const ACHIEVEMENT_STATUSES = [
  "locked",
  "unlocked",
  "claimed",
] as const;

export type AchievementStatus =
  (typeof ACHIEVEMENT_STATUSES)[number];

export interface AchievementReward {
  gp?: number;
  xp?: number;
  reputation?: number;
  badgeId?: string;
  titleId?: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  eventType: string;
  target: number;
  reward: AchievementReward;
  hidden?: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  status: AchievementStatus;
  progress: number;
  version: number;
  lastEventAt?: string;
  unlockedAt?: string;
  claimedAt?: string;
}

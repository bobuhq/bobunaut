import type {
  AchievementDefinition,
  AchievementProgress,
  AchievementStatus,
} from "../models";

export type AchievementDisplayStatus =
  | "locked"
  | "unlocked"
  | "claimed";

export interface AchievementViewModel {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  progressPercent: number;
  rewardGp: number;
  rewardLabel: string;
  status: AchievementDisplayStatus;
  rawStatus: AchievementStatus;
  unlockedAt?: string;
  claimedAt?: string;
}

function mapStatus(
  status: AchievementStatus,
): AchievementDisplayStatus {

  switch (status) {

    case "claimed":
      return "claimed";

    case "unlocked":
      return "unlocked";

    default:
      return "locked";
  }
}

export function createAchievementViewModel(
  definition: AchievementDefinition,
  progress?: AchievementProgress,
): AchievementViewModel {

  const current =
    progress?.progress ?? 0;

  const rewardGp =
    definition.reward.gp ?? 0;

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    target: definition.target,
    progress: current,
    progressPercent:
      definition.target === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              current /
                definition.target *
                100,
            ),
          ),
    rewardGp,
    rewardLabel:
      rewardGp > 0
        ? `${rewardGp.toLocaleString()} GP`
        : "No GP",
    status: mapStatus(
      progress?.status ?? "locked",
    ),
    rawStatus:
      progress?.status ?? "locked",
    unlockedAt:
      progress?.unlockedAt,
    claimedAt:
      progress?.claimedAt,
  };
}

export function createAchievementViewModels(
  definitions: AchievementDefinition[],
  progress: AchievementProgress[],
): AchievementViewModel[] {

  const map = new Map(
    progress.map((item) => [
      item.achievementId,
      item,
    ]),
  );

  return definitions.map(
    (definition) =>
      createAchievementViewModel(
        definition,
        map.get(definition.id),
      ),
  );
}

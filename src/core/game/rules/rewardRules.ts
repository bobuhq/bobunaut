import type {
  AchievementDefinition,
  MissionDefinition,
} from "../models";

export const MINIMUM_GP_REWARD = 50;

interface RewardDefinition {
  gp?: number;
}

const validateGpReward = (
  sourceType: string,
  sourceId: string,
  reward: RewardDefinition,
): void => {
  if (reward.gp === undefined) {
    return;
  }

  if (
    !Number.isInteger(reward.gp) ||
    reward.gp < MINIMUM_GP_REWARD
  ) {
    throw new Error(
      `${sourceType} "${sourceId}" must award at least ` +
        `${MINIMUM_GP_REWARD} GP when a GP reward is defined.`,
    );
  }
};

export const defineMissionCatalog = <
  const T extends readonly MissionDefinition[],
>(
  definitions: T,
): T => {
  definitions.forEach((definition) => {
    validateGpReward(
      "Mission",
      definition.id,
      definition.reward,
    );
  });

  return definitions;
};

export const defineAchievementCatalog = <
  const T extends readonly AchievementDefinition[],
>(
  definitions: T,
): T => {
  definitions.forEach((definition) => {
    validateGpReward(
      "Achievement",
      definition.id,
      definition.reward,
    );
  });

  return definitions;
};

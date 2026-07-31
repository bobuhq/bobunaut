import type {
  AchievementProgress,
} from "../models";

import {
  achievementProgressRepository,
} from "../repository/AchievementProgressRepository";

import {
  achievementRepository,
} from "../repository/AchievementRepository";

export const achievementProgressRestoreService = {
  async restore(
    builderId: string,
  ): Promise<AchievementProgress[]> {
    const progress =
      await achievementProgressRepository
        .loadByBuilder();

    achievementRepository.restoreBuilderProgress(
      builderId,
      progress,
    );

    return progress;
  },
};

import {
  achievementProgressRepository,
} from "../repository/AchievementProgressRepository";

import {
  restoreAuthenticatedBuilder,
} from "../../builder/services/BuilderRestoreService";

import {
  achievementProgressRestoreService,
} from "./AchievementProgressRestoreService";

export class AchievementRewardService {
  async claim(
    builderId: string,
    achievementId: string,
  ) {
    const result =
      await achievementProgressRepository.claimMine(
        achievementId,
      );

    await Promise.all([
      restoreAuthenticatedBuilder(builderId),
      achievementProgressRestoreService.restore(
        builderId,
      ),
    ]);

    return result;
  }
}

export const achievementRewardService =
  new AchievementRewardService();

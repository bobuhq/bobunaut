import {
  gpEngine,
  type AchievementGPRewardClaimResult,
} from "../../gp";

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
  ): Promise<AchievementGPRewardClaimResult> {
    const result =
      await gpEngine.claimAchievementReward(
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

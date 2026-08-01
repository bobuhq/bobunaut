import {
  gpEngine,
  type MissionGPRewardClaimResult,
} from "../../gp";

import {
  restoreAuthenticatedBuilder,
} from "../../builder/services/BuilderRestoreService";

import {
  missionProgressRestoreService,
} from "./MissionProgressRestoreService";

export class MissionRewardService {
  async claim(
    builderId: string,
    missionId: string,
    cycleKey: string,
  ): Promise<MissionGPRewardClaimResult> {
    const result =
      await gpEngine.claimMissionReward(
        missionId,
        cycleKey,
      );

    await Promise.all([
      restoreAuthenticatedBuilder(builderId),
      missionProgressRestoreService.restore(
        builderId,
      ),
    ]);

    return result;
  }
}

export const missionRewardService =
  new MissionRewardService();

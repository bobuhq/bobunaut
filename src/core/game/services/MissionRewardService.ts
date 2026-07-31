import {
  missionProgressRepository,
} from "../repository/MissionProgressRepository";

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
  ) {
    const result =
      await missionProgressRepository.claimMine(
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

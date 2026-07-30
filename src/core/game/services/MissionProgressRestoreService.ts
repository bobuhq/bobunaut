import type {
  MissionProgress,
} from "../models";

import {
  missionProgressRepository,
} from "../repository/MissionProgressRepository";

import {
  missionRepository,
} from "../repository/MissionRepository";

export const missionProgressRestoreService = {
  async restore(
    builderId: string,
  ): Promise<MissionProgress[]> {
    const progress =
      await missionProgressRepository
        .loadByBuilder(builderId);

    missionRepository.restoreBuilderProgress(
      builderId,
      progress,
    );

    return progress;
  },
};

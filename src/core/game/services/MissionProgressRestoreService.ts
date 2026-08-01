import { supabase } from "../../../lib/supabase";

import type {
  MissionProgress,
} from "../models";

import {
  missionProgressRepository,
} from "../repository/MissionProgressRepository";

import {
  missionRepository,
} from "../repository/MissionRepository";

/**
 * Restores mission progress only while the requested Builder
 * remains the authenticated session owner.
 */
export const missionProgressRestoreService = {
  async restore(
    builderId: string,
  ): Promise<MissionProgress[]> {
    const normalizedBuilderId =
      builderId.trim();

    if (!normalizedBuilderId) {
      throw new Error(
        "Builder ID is required to restore mission progress.",
      );
    }

    const progress =
      await missionProgressRepository
        .loadByBuilder(normalizedBuilderId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (
      session?.user.id !== normalizedBuilderId
    ) {
      return [];
    }

    missionRepository.restoreBuilderProgress(
      normalizedBuilderId,
      progress,
    );

    return progress;
  },
};

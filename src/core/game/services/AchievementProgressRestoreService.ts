import { supabase } from "../../../lib/supabase";

import type {
  AchievementProgress,
} from "../models";

import {
  achievementProgressRepository,
} from "../repository/AchievementProgressRepository";

import {
  achievementRepository,
} from "../repository/AchievementRepository";

/**
 * Restores achievement progress only while the requested Builder
 * remains the authenticated session owner.
 */
export const achievementProgressRestoreService = {
  async restore(
    builderId: string,
  ): Promise<AchievementProgress[]> {
    const normalizedBuilderId =
      builderId.trim();

    if (!normalizedBuilderId) {
      throw new Error(
        "Builder ID is required to restore achievement progress.",
      );
    }

    const progress =
      await achievementProgressRepository
        .loadByBuilder(normalizedBuilderId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (
      session?.user.id !== normalizedBuilderId
    ) {
      return [];
    }

    achievementRepository.restoreBuilderProgress(
      normalizedBuilderId,
      progress,
    );

    return progress;
  },
};

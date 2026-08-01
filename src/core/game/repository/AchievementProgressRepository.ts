import { supabase } from "../../../lib/supabase";

import {
  ACHIEVEMENT_STATUSES,
  type AchievementProgress,
  type AchievementStatus,
} from "../models";

export interface AchievementRewardClaimResult {
  claimedNow: boolean;
  achievementId: string;
  rewardGp: number;
  totalGp: number;
  ledgerId?: string;
  claimedAt: string;
}

interface AchievementRewardClaimRow {
  claimed_now: boolean;
  achievement_id: string;
  reward_gp: number;
  total_gp: number;
  ledger_id: string | null;
  claimed_at: string;
}

interface AchievementProgressRow {
  id: string;
  builder_id: string;
  achievement_id: string;
  status: string;
  progress: number;
  version: number;
  last_event_at: string | null;
  unlocked_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

const achievementProgressColumns = `
  id,
  builder_id,
  achievement_id,
  status,
  progress,
  version,
  last_event_at,
  unlocked_at,
  claimed_at,
  created_at,
  updated_at
`;

const isAchievementStatus = (
  value: string,
): value is AchievementStatus =>
  ACHIEVEMENT_STATUSES.some(
    (status) => status === value,
  );

const mapAchievementProgressRow = (
  row: AchievementProgressRow,
): AchievementProgress => {
  if (!isAchievementStatus(row.status)) {
    throw new Error(
      `Unknown achievement status received: ${row.status}`,
    );
  }

  return {
    achievementId: row.achievement_id,
    status: row.status,
    progress: row.progress,
    version: row.version,
    lastEventAt:
      row.last_event_at ?? undefined,
    unlockedAt:
      row.unlocked_at ?? undefined,
    claimedAt:
      row.claimed_at ?? undefined,
  };
};

const requireBuilderId = (
  builderId: string,
): string => {
  const normalizedBuilderId =
    builderId.trim();

  if (normalizedBuilderId.length === 0) {
    throw new Error(
      "Builder ID is required to load achievement progress.",
    );
  }

  return normalizedBuilderId;
};

const requireAchievementId = (
  achievementId: string,
): string => {
  const normalizedAchievementId =
    achievementId.trim();

  if (normalizedAchievementId.length === 0) {
    throw new Error(
      "Achievement ID is required.",
    );
  }

  return normalizedAchievementId;
};

export class AchievementProgressRepository {
  async loadByBuilder(
    builderId: string,
  ): Promise<AchievementProgress[]> {
    const normalizedBuilderId =
      requireBuilderId(builderId);

    const { data, error } = await supabase
      .from("achievement_progress")
      .select(achievementProgressColumns)
      .eq("builder_id", normalizedBuilderId)
      .order("created_at", {
        ascending: true,
      })
      .returns<AchievementProgressRow[]>();

    if (error) {
      throw new Error(
        `Achievement progress could not be loaded: ${error.message}`,
      );
    }

    return (data ?? []).map(
      mapAchievementProgressRow,
    );
  }

  async loadOne(
    achievementId: string,
  ): Promise<AchievementProgress | null> {
    const normalizedAchievementId =
      requireAchievementId(achievementId);

    const { data, error } = await supabase
      .from("achievement_progress")
      .select(achievementProgressColumns)
      .eq(
        "achievement_id",
        normalizedAchievementId,
      )
      .maybeSingle<AchievementProgressRow>();

    if (error) {
      throw new Error(
        `Achievement progress could not be loaded: ${error.message}`,
      );
    }

    return data
      ? mapAchievementProgressRow(data)
      : null;
  }

  async saveMine(
    progress: AchievementProgress,
  ): Promise<AchievementProgress> {
    const achievementId =
      requireAchievementId(
        progress.achievementId,
      );

    const { data, error } = await supabase.rpc(
      "save_my_achievement_progress",
      {
        p_achievement_id: achievementId,
        p_status: progress.status,
        p_progress: progress.progress,
        p_version: progress.version,
        p_last_event_at:
          progress.lastEventAt ?? null,
        p_unlocked_at:
          progress.unlockedAt ?? null,
        p_claimed_at:
          progress.claimedAt ?? null,
      },
    );

    if (error) {
      throw new Error(
        `Achievement progress could not be saved: ${error.message}`,
      );
    }

    const normalizedData = Array.isArray(data)
      ? data[0]
      : data;

    if (!normalizedData) {
      throw new Error(
        "Achievement progress save returned no data.",
      );
    }

    return mapAchievementProgressRow(
      normalizedData as AchievementProgressRow,
    );
  }

  async claimMine(
    achievementId: string,
  ): Promise<AchievementRewardClaimResult> {
    const normalizedAchievementId =
      requireAchievementId(achievementId);

    const { data, error } = await supabase.rpc(
      "claim_my_achievement_reward",
      {
        p_achievement_id:
          normalizedAchievementId,
      },
    );

    if (error) {
      throw new Error(
        `Achievement reward could not be claimed: ${error.message}`,
      );
    }

    const normalizedData = Array.isArray(data)
      ? data[0]
      : data;

    if (!normalizedData) {
      throw new Error(
        "Achievement reward claim returned no data.",
      );
    }

    const row =
      normalizedData as AchievementRewardClaimRow;

    if (
      typeof row.claimed_now !== "boolean" ||
      typeof row.achievement_id !== "string" ||
      typeof row.reward_gp !== "number" ||
      typeof row.total_gp !== "number" ||
      typeof row.claimed_at !== "string"
    ) {
      throw new Error(
        "Achievement reward claim returned invalid data.",
      );
    }

    return {
      claimedNow: row.claimed_now,
      achievementId: row.achievement_id,
      rewardGp: row.reward_gp,
      totalGp: row.total_gp,
      ledgerId:
        row.ledger_id ?? undefined,
      claimedAt: row.claimed_at,
    };
  }
}

export const achievementProgressRepository =
  new AchievementProgressRepository();

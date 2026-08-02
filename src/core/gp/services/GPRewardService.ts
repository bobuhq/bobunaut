import { supabase } from "../../../lib/supabase";

export type GenesisRewardProvider =
  | "telegram"
  | "x"
  | "instagram";

export interface GPRewardClaimResult {
  verified: boolean;
  linked?: boolean;
  rewarded: boolean;
  alreadyRewarded: boolean;
  rewardGp: number;
  totalGp: number;
  message?: string;
  warning?: string;
}

export interface MissionGPRewardClaimResult {
  claimedNow: boolean;
  missionId: string;
  cycleKey: string;
  rewardGp: number;
  totalGp: number;
  ledgerId?: string;
  claimedAt: string;
}

export interface AchievementGPRewardClaimResult {
  claimedNow: boolean;
  achievementId: string;
  rewardGp: number;
  totalGp: number;
  ledgerId?: string;
  claimedAt: string;
}

interface GPRewardFunctionResponse {
  verified?: boolean;
  linked?: boolean;
  rewarded?: boolean;
  already_rewarded?: boolean;
  reward_gp?: number | string;
  total_gp?: number | string;
  message?: string;
  warning?: string;
  error?: string;
}

interface MissionRewardClaimRow {
  claimed_now: boolean;
  mission_id: string;
  cycle_key: string;
  reward_gp: number;
  total_gp: number;
  ledger_id: string | null;
  claimed_at: string;
}

interface AchievementRewardClaimRow {
  claimed_now: boolean;
  achievement_id: string;
  reward_gp: number;
  total_gp: number;
  ledger_id: string | null;
  claimed_at: string;
}

const rewardFunctionByProvider: Record<
  GenesisRewardProvider,
  string
> = {
  telegram: "verify-telegram",
  x: "claim-x-reward",
  instagram: "claim-instagram-reward",
};

const numberValue = (
  value: number | string | undefined,
): number => {
  const normalized = Number(value ?? 0);

  return Number.isFinite(normalized)
    ? normalized
    : 0;
};

interface EdgeFunctionErrorLike {
  message?: string;
  context?: Response;
}

const readEdgeFunctionError = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  const candidate =
    error as EdgeFunctionErrorLike | null;

  const response = candidate?.context;

  if (response instanceof Response) {
    try {
      const payload =
        await response.clone().json() as {
          error?: unknown;
          message?: unknown;
          warning?: unknown;
        };

      if (
        typeof payload.error === "string" &&
        payload.error.trim()
      ) {
        return payload.error.trim();
      }

      if (
        typeof payload.message === "string" &&
        payload.message.trim()
      ) {
        return payload.message.trim();
      }

      if (
        typeof payload.warning === "string" &&
        payload.warning.trim()
      ) {
        return payload.warning.trim();
      }
    } catch {
      try {
        const body =
          await response.clone().text();

        if (body.trim()) {
          return body.trim();
        }
      } catch {
        // Fall through to the original error message.
      }
    }
  }

  if (
    typeof candidate?.message === "string" &&
    candidate.message.trim()
  ) {
    return candidate.message.trim();
  }

  return fallback;
};

const requireValue = (
  value: string,
  label: string,
): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
};

export class GPRewardService {
  async claimGenesisReward(
    provider: GenesisRewardProvider,
  ): Promise<GPRewardClaimResult> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(
        `Authenticated session could not be loaded: ${sessionError.message}`,
      );
    }

    if (!session?.access_token) {
      throw new Error(
        "Authentication is required to claim a GP reward.",
      );
    }

    const functionName =
      rewardFunctionByProvider[provider];

    const { data, error } =
      await supabase.functions.invoke<
        GPRewardFunctionResponse
      >(
        functionName,
        {
          body: {},
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );

    if (error) {
      const reason =
        await readEdgeFunctionError(
          error,
          `${provider} GP reward could not be processed.`,
        );

      throw new Error(reason);
    }

    if (!data) {
      throw new Error(
        `${provider} GP reward returned no data.`,
      );
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      verified: data.verified === true,
      linked: data.linked,
      rewarded: data.rewarded === true,
      alreadyRewarded:
        data.already_rewarded === true,
      rewardGp: numberValue(data.reward_gp),
      totalGp: numberValue(data.total_gp),
      message: data.message,
      warning: data.warning,
    };
  }

  async claimMissionReward(
    missionId: string,
    cycleKey: string,
  ): Promise<MissionGPRewardClaimResult> {
    const normalizedMissionId =
      requireValue(missionId, "Mission ID");

    const normalizedCycleKey =
      requireValue(cycleKey, "Cycle key");

    const { data, error } = await supabase.rpc(
      "claim_my_mission_reward",
      {
        p_mission_id: normalizedMissionId,
        p_cycle_key: normalizedCycleKey,
      },
    );

    if (error) {
      throw new Error(
        `Mission reward could not be claimed: ${error.message}`,
      );
    }

    const normalizedData = Array.isArray(data)
      ? data[0]
      : data;

    if (!normalizedData) {
      throw new Error(
        "Mission reward claim returned no data.",
      );
    }

    const row =
      normalizedData as MissionRewardClaimRow;

    if (
      typeof row.claimed_now !== "boolean" ||
      typeof row.mission_id !== "string" ||
      typeof row.cycle_key !== "string" ||
      typeof row.reward_gp !== "number" ||
      typeof row.total_gp !== "number" ||
      typeof row.claimed_at !== "string"
    ) {
      throw new Error(
        "Mission reward claim returned invalid data.",
      );
    }

    return {
      claimedNow: row.claimed_now,
      missionId: row.mission_id,
      cycleKey: row.cycle_key,
      rewardGp: row.reward_gp,
      totalGp: row.total_gp,
      ledgerId:
        row.ledger_id ?? undefined,
      claimedAt: row.claimed_at,
    };
  }

  async claimAchievementReward(
    achievementId: string,
  ): Promise<AchievementGPRewardClaimResult> {
    const normalizedAchievementId =
      requireValue(
        achievementId,
        "Achievement ID",
      );

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

export const gpRewardService =
  new GPRewardService();

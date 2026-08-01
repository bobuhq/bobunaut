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
      throw new Error(
        `${provider} GP reward could not be processed: ${error.message}`,
      );
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
}

export const gpRewardService =
  new GPRewardService();

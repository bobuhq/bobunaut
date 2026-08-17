import { supabase } from "../../../lib/supabase";

type MiningGatewayErrorPayload = {
  error?: string;
  code?: string | null;
};

async function resolveMiningGatewayError(
  error: unknown,
): Promise<Error> {
  const context =
    (
      error as {
        context?: {
          json?: () => Promise<unknown>;
        };
      }
    )?.context;

  if (context?.json) {
    try {
      const payload =
        (await context.json()) as
          MiningGatewayErrorPayload;

      if (payload?.error) {
        const gatewayError =
          new Error(payload.error) as Error & {
            code?: string;
          };

        if (typeof payload.code === "string") {
          gatewayError.code = payload.code;
        }

        return gatewayError;
      }
    } catch {
      // Fall through to generic error.
    }
  }

  return new Error(
    error instanceof Error
      ? error.message
      : "Mining action failed.",
  );
}

export type BuilderMiningState = {
  sessionId: string | null;
  serverNow: string;
  startedAt: string | null;
  endsAt: string | null;
  status: "active" | "completed" | "claimed" | null;
  active: boolean;
  claimable: boolean;
  activeReferralCount: number;
  baseRatePerHour: number;
  referralBonusRate: number;
  totalRatePerHour: number;
  rewardGp: number;
  walletGp: number;
};

type MiningStateRow = {
  session_id: string | null;
  server_now: string;
  started_at: string | null;
  ends_at: string | null;
  status: BuilderMiningState["status"];
  active: boolean | null;
  claimable: boolean | null;
  active_referral_count: number | string | null;
  base_rate_per_hour: number | string | null;
  referral_bonus_rate: number | string | null;
  total_rate_per_hour: number | string | null;
  reward_gp: number | string | null;
  wallet_gp: number | string | null;
};

const toNumber = (
  value: number | string | null | undefined,
): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapState = (
  row: MiningStateRow,
): BuilderMiningState => ({
  sessionId: row.session_id,
  serverNow: row.server_now,
  startedAt: row.started_at,
  endsAt: row.ends_at,
  status: row.status,
  active: row.active === true,
  claimable: row.claimable === true,
  activeReferralCount: toNumber(
    row.active_referral_count,
  ),
  baseRatePerHour: toNumber(
    row.base_rate_per_hour,
  ),
  referralBonusRate: toNumber(
    row.referral_bonus_rate,
  ),
  totalRatePerHour: toNumber(
    row.total_rate_per_hour,
  ),
  rewardGp: toNumber(row.reward_gp),
  walletGp: toNumber(row.wallet_gp),
});

const firstRow = <T>(data: T | T[] | null): T | null =>
  Array.isArray(data) ? data[0] ?? null : data;

export const builderMiningService = {
  async getState(): Promise<BuilderMiningState> {
    const { data, error } = await supabase.rpc(
      "get_my_mining_state",
    );

    if (error) {
      throw new Error(error.message);
    }

    const row = firstRow(
      data as MiningStateRow[] | MiningStateRow | null,
    );

    if (!row) {
      throw new Error("Mining state was not returned.");
    }

    return mapState(row);
  },

  async start(): Promise<BuilderMiningState> {
    const { data, error } =
      await supabase.functions.invoke(
        "mining-security-gateway",
        {
          body: {
            action: "start",
          },
        },
      );

    if (error) {
      throw await resolveMiningGatewayError(
        error,
      );
    }

    if (!data?.accepted) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Unable to start mining.",
      );
    }

    return this.getState();
  },

  async claim(): Promise<BuilderMiningState> {
    const { data, error } =
      await supabase.functions.invoke(
        "mining-security-gateway",
        {
          body: {
            action: "claim",
          },
        },
      );

    if (error) {
      throw await resolveMiningGatewayError(
        error,
      );
    }

    if (!data?.accepted) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Unable to claim mining reward.",
      );
    }

    return this.getState();
  },
};

import { supabase } from "../../lib/supabase";

export type AdminHealthStatus =
  | "healthy"
  | "warning"
  | "offline"
  | "planned";

export interface AdminAnalyticsTrendPoint {
  date: string;
  value: number;
}

export interface AdminAnalyticsLeaderboardEntry {
  builderId: string;
  username: string | null;
  displayName: string | null;
  gp: number;
  level: number;
  referralCount: number;
}

export interface AdminUniverseHealthItem {
  engine: string;
  status: AdminHealthStatus;
  detail: string;
  metric: string;
  metricLabel: string;
}

export interface AdminAnalytics {
  generatedAt: string;

  builders: {
    total: number;
    today: number;
    week: number;
    month: number;
    previousMonth: number;
    growthPercent: number;
  };

  gp: {
    walletTotal: number;
    creditsToday: number;
    creditsWeek: number;
    creditsMonth: number;
    debitsMonth: number;
    averageCredit: number;
  };

  mining: {
    active: number;
    expired: number;
    completed: number;
    claimed: number;
    startedToday: number;
    claimedToday: number;
    averageReward: number;
    averageRate: number;
  };

  verification: {
    telegram: number;
    x: number;
    instagram: number;
    wallet: number;
    pending: number;
    fullyVerified: number;
  };

  referrals: {
    total: number;
    active: number;
    pending: number;
    createdToday: number;
    largestNetwork: number;
  };

  leaderboard: AdminAnalyticsLeaderboardEntry[];
  builderTrend: AdminAnalyticsTrendPoint[];
  gpTrend: AdminAnalyticsTrendPoint[];
  miningTrend: AdminAnalyticsTrendPoint[];
  health: AdminUniverseHealthItem[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as UnknownRecord;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : 0;
}

function stringValue(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function nullableString(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    value.length > 0
    ? value
    : null;
}

function healthStatus(
  value: unknown,
): AdminHealthStatus {
  switch (value) {
    case "warning":
    case "offline":
    case "planned":
      return value;

    default:
      return "healthy";
  }
}

function trendPoints(
  value: unknown,
): AdminAnalyticsTrendPoint[] {
  return asArray(value).map((entry) => {
    const point = asRecord(entry);

    return {
      date: stringValue(point.date),
      value: numberValue(point.value),
    };
  });
}

export const AdminAnalyticsService = {
  async getAnalytics(): Promise<AdminAnalytics> {
    const { data, error } = await supabase.rpc(
      "get_admin_analytics",
    );

    if (error) {
      throw new Error(
        `Unable to load Analytics: ${error.message}`,
      );
    }

    const response = asRecord(data);
    const builders = asRecord(response.builders);
    const gp = asRecord(response.gp);
    const mining = asRecord(response.mining);
    const verification = asRecord(
      response.verification,
    );
    const referrals = asRecord(response.referrals);

    const month = numberValue(builders.month);
    const previousMonth = numberValue(
      builders.previousMonth,
    );

    const growthPercent =
      previousMonth > 0
        ? ((month - previousMonth) /
            previousMonth) *
          100
        : month > 0
          ? 100
          : 0;

    return {
      generatedAt: stringValue(
        response.generatedAt,
        new Date().toISOString(),
      ),

      builders: {
        total: numberValue(builders.total),
        today: numberValue(builders.today),
        week: numberValue(builders.week),
        month,
        previousMonth,
        growthPercent,
      },

      gp: {
        walletTotal: numberValue(gp.walletTotal),
        creditsToday: numberValue(gp.creditsToday),
        creditsWeek: numberValue(gp.creditsWeek),
        creditsMonth: numberValue(gp.creditsMonth),
        debitsMonth: numberValue(gp.debitsMonth),
        averageCredit: numberValue(gp.averageCredit),
      },

      mining: {
        active: numberValue(mining.active),
        expired: numberValue(mining.expired),
        completed: numberValue(mining.completed),
        claimed: numberValue(mining.claimed),
        startedToday: numberValue(
          mining.startedToday,
        ),
        claimedToday: numberValue(
          mining.claimedToday,
        ),
        averageReward: numberValue(
          mining.averageReward,
        ),
        averageRate: numberValue(
          mining.averageRate,
        ),
      },

      verification: {
        telegram: numberValue(
          verification.telegram,
        ),
        x: numberValue(verification.x),
        instagram: numberValue(
          verification.instagram,
        ),
        wallet: numberValue(verification.wallet),
        pending: numberValue(
          verification.pending,
        ),
        fullyVerified: numberValue(
          verification.fullyVerified,
        ),
      },

      referrals: {
        total: numberValue(referrals.total),
        active: numberValue(referrals.active),
        pending: numberValue(referrals.pending),
        createdToday: numberValue(
          referrals.createdToday,
        ),
        largestNetwork: numberValue(
          referrals.largestNetwork,
        ),
      },

      leaderboard: asArray(
        response.leaderboard,
      ).map((value) => {
        const entry = asRecord(value);

        return {
          builderId: stringValue(entry.builderId),
          username: nullableString(entry.username),
          displayName: nullableString(
            entry.displayName,
          ),
          gp: numberValue(entry.gp),
          level: numberValue(entry.level),
          referralCount: numberValue(
            entry.referralCount,
          ),
        };
      }),

      builderTrend: trendPoints(
        response.builderTrend,
      ),
      gpTrend: trendPoints(response.gpTrend),
      miningTrend: trendPoints(
        response.miningTrend,
      ),

      health: asArray(response.health).map(
        (value) => {
          const item = asRecord(value);
          const engine = stringValue(
            item.engine,
            "Unknown Engine",
          );

          const verifiedIdentityCount =
            numberValue(verification.telegram) +
            numberValue(verification.x) +
            numberValue(verification.instagram) +
            numberValue(verification.wallet);

          switch (engine) {
            case "API":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: "60s",
                metricLabel: "refresh",
              };

            case "Database":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: numberValue(
                  builders.total,
                ).toLocaleString("en-US"),
                metricLabel: "builders",
              };

            case "Reward Engine":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: numberValue(
                  gp.walletTotal,
                ).toLocaleString("en-US"),
                metricLabel: "GP",
              };

            case "Mining Engine":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: numberValue(
                  mining.active,
                ).toLocaleString("en-US"),
                metricLabel: "active",
              };

            case "Identity Engine":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric:
                  verifiedIdentityCount.toLocaleString(
                    "en-US",
                  ),
                metricLabel: "verified",
              };

            case "Referral Engine":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: numberValue(
                  referrals.total,
                ).toLocaleString("en-US"),
                metricLabel: "links",
              };

            case "Wallet Engine":
            case "Mission Engine":
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: "Not",
                metricLabel: "deployed",
              };

            default:
              return {
                engine,
                status: healthStatus(item.status),
                detail: stringValue(item.detail),
                metric: "—",
                metricLabel: "status",
              };
          }
        },
      ),
    };
  },
};

import { supabase } from "../../../lib/supabase";

type MiningStreakRow = {
  current_streak_days: number | string | null;
  best_streak_days: number | string | null;
  total_claimed_sessions: number | string | null;
  lifetime_mined_gp: number | string | null;
  last_claimed_at: string | null;
  streak_active_today: boolean | null;
};

export type MiningStreakSnapshot = {
  currentStreakDays: number;
  bestStreakDays: number;
  totalClaimedSessions: number;
  lifetimeMinedGp: number;
  lastClaimedAt: string | null;
  streakActiveToday: boolean;
};

const toNumber = (
  value: number | string | null | undefined,
): number => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : 0;
};

const firstRow = <T>(
  data: T | T[] | null,
): T | null =>
  Array.isArray(data)
    ? data[0] ?? null
    : data;

export const miningStreakService = {
  async load(): Promise<MiningStreakSnapshot> {
    const { data, error } = await supabase.rpc(
      "get_my_mining_streak",
    );

    if (error) {
      throw new Error(
        `Mining streak could not be loaded: ${error.message}`,
      );
    }

    const row = firstRow(
      data as
        | MiningStreakRow
        | MiningStreakRow[]
        | null,
    );

    if (!row) {
      return {
        currentStreakDays: 0,
        bestStreakDays: 0,
        totalClaimedSessions: 0,
        lifetimeMinedGp: 0,
        lastClaimedAt: null,
        streakActiveToday: false,
      };
    }

    return {
      currentStreakDays: toNumber(
        row.current_streak_days,
      ),
      bestStreakDays: toNumber(
        row.best_streak_days,
      ),
      totalClaimedSessions: toNumber(
        row.total_claimed_sessions,
      ),
      lifetimeMinedGp: toNumber(
        row.lifetime_mined_gp,
      ),
      lastClaimedAt: row.last_claimed_at,
      streakActiveToday:
        row.streak_active_today === true,
    };
  },
};

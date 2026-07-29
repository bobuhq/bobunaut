import { supabase } from "../../../lib/supabase";

export interface LeaderboardEntry {
  rank: number;
  builderId: string;
  username: string | null;
  displayName: string | null;
  level: number;
  gp: number;
  reputation: number;
  referralCount: number;
}

interface LeaderboardEntryRow {
  rank: number | string;
  builder_id: string;
  username: string | null;
  display_name: string | null;
  level: number;
  gp: number | string;
  reputation: number | string;
  referral_count: number;
}

const toSafeNumber = (
  value: number | string | null | undefined,
): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const mapLeaderboardEntry = (
  row: LeaderboardEntryRow,
): LeaderboardEntry => ({
  rank: toSafeNumber(row.rank),
  builderId: row.builder_id,
  username: row.username,
  displayName: row.display_name,
  level: toSafeNumber(row.level),
  gp: toSafeNumber(row.gp),
  reputation: toSafeNumber(row.reputation),
  referralCount: toSafeNumber(row.referral_count),
});

export const leaderboardService = {
  async loadGlobalLeaderboard(
    limit = 50,
    offset = 0,
  ): Promise<LeaderboardEntry[]> {
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit), 1),
      100,
    );
    const safeOffset = Math.max(
      Math.trunc(offset),
      0,
    );

    const { data, error } = await supabase
      .rpc("get_global_leaderboard", {
        p_limit: safeLimit,
        p_offset: safeOffset,
      })
      .returns<LeaderboardEntryRow[]>();

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data)
      ? data
      : [];

    return rows.map(mapLeaderboardEntry);
  },

  async loadMyRank(): Promise<LeaderboardEntry | null> {
    const { data, error } = await supabase
      .rpc("get_my_leaderboard_rank")
      .returns<LeaderboardEntryRow[]>();

    if (error) {
      throw error;
    }

    const row = Array.isArray(data)
      ? data[0]
      : null;

    return row
      ? mapLeaderboardEntry(row)
      : null;
  },
};

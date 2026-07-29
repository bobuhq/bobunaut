import { supabase } from "../../lib/supabase";

export type AdminMiningStatus =
  | "active"
  | "expired"
  | "completed"
  | "claimed";

export interface AdminMiningSession {
  sessionId: string;
  builderId: string;
  username: string | null;
  displayName: string | null;
  status: AdminMiningStatus;
  startedAt: string;
  endsAt: string;
  claimedAt: string | null;
  baseRatePerHour: number;
  activeReferralCount: number;
  referralBonusRate: number;
  totalRatePerHour: number;
  rewardGp: number;
  ledgerId: string | null;
  createdAt: string;
  updatedAt: string;
  remainingSeconds: number;
}

export interface AdminMiningSessionsQuery {
  limit?: number;
  offset?: number;
  search?: string;
  status?: AdminMiningStatus | "";
}

interface AdminMiningSessionRow {
  session_id: string;
  builder_id: string;
  username: string | null;
  display_name: string | null;
  status: string;
  started_at: string;
  ends_at: string;
  claimed_at: string | null;
  base_rate_per_hour: number | string | null;
  active_referral_count: number | string | null;
  referral_bonus_rate: number | string | null;
  total_rate_per_hour: number | string | null;
  reward_gp: number | string | null;
  ledger_id: string | null;
  created_at: string;
  updated_at: string;
  remaining_seconds: number | string | null;
}

function normalizeNumber(
  value: number | string | null,
): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(
  value: string,
): AdminMiningStatus {
  if (
    value === "expired" ||
    value === "completed" ||
    value === "claimed"
  ) {
    return value;
  }

  return "active";
}

export const AdminMiningSessionsService = {
  async getSessions(
    query: AdminMiningSessionsQuery = {},
  ): Promise<AdminMiningSession[]> {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit ?? 25), 1),
      100,
    );

    const offset = Math.max(
      Math.trunc(query.offset ?? 0),
      0,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_mining_sessions",
      {
        p_limit: limit,
        p_offset: offset,
        p_search: query.search?.trim() || null,
        p_status: query.status || null,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Mining Sessions: ${error.message}`,
      );
    }

    const rows = (data ?? []) as AdminMiningSessionRow[];

    return rows.map((row) => ({
      sessionId: row.session_id,
      builderId: row.builder_id,
      username: row.username,
      displayName: row.display_name,
      status: normalizeStatus(row.status),
      startedAt: row.started_at,
      endsAt: row.ends_at,
      claimedAt: row.claimed_at,
      baseRatePerHour: normalizeNumber(
        row.base_rate_per_hour,
      ),
      activeReferralCount: normalizeNumber(
        row.active_referral_count,
      ),
      referralBonusRate: normalizeNumber(
        row.referral_bonus_rate,
      ),
      totalRatePerHour: normalizeNumber(
        row.total_rate_per_hour,
      ),
      rewardGp: normalizeNumber(row.reward_gp),
      ledgerId: row.ledger_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      remainingSeconds: normalizeNumber(
        row.remaining_seconds,
      ),
    }));
  },
};

import { supabase } from "../../lib/supabase";

export type AdminRewardEntryType =
  | "credit"
  | "debit";

export interface AdminRewardLedgerEntry {
  ledgerId: string;
  builderId: string;
  username: string | null;
  displayName: string | null;
  rewardType: string;
  provider: string | null;
  entryType: AdminRewardEntryType;
  amount: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminRewardLedgerQuery {
  limit?: number;
  offset?: number;
  search?: string;
  entryType?: AdminRewardEntryType | "";
  rewardType?: string;
}

interface AdminRewardLedgerRow {
  ledger_id: string;
  builder_id: string;
  username: string | null;
  display_name: string | null;
  reward_type: string;
  provider: string | null;
  entry_type: string;
  amount: number | string | null;
  idempotency_key: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function normalizeNumber(
  value: number | string | null,
): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export const AdminRewardLedgerService = {
  async getEntries(
    query: AdminRewardLedgerQuery = {},
  ): Promise<AdminRewardLedgerEntry[]> {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit ?? 25), 1),
      100,
    );

    const offset = Math.max(
      Math.trunc(query.offset ?? 0),
      0,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_reward_ledger",
      {
        p_limit: limit,
        p_offset: offset,
        p_search: query.search?.trim() || null,
        p_entry_type: query.entryType || null,
        p_reward_type:
          query.rewardType?.trim() || null,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Reward Ledger: ${error.message}`,
      );
    }

    const rows = (data ?? []) as AdminRewardLedgerRow[];

    return rows.map((row) => ({
      ledgerId: row.ledger_id,
      builderId: row.builder_id,
      username: row.username,
      displayName: row.display_name,
      rewardType: row.reward_type,
      provider: row.provider,
      entryType:
        row.entry_type === "debit"
          ? "debit"
          : "credit",
      amount: normalizeNumber(row.amount),
      idempotencyKey: row.idempotency_key,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }));
  },
};

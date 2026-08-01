import { supabase } from "../../../lib/supabase";

type MiningLedgerRow = {
  id: string;
  amount: number | string;
  metadata: Record<string, unknown> | null;
  entry_type: string | null;
  created_at: string;
};

export type MiningHistoryEntry = {
  id: string;
  amountGp: number;
  createdAt: string;
  sessionId: string | null;
  startedAt: string | null;
  endsAt: string | null;
};

const toNumber = (
  value: number | string | null | undefined,
): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readString = (
  metadata: Record<string, unknown>,
  key: string,
): string | null => {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
};

export const miningHistoryService = {
  async load(
    builderId: string,
    limit = 10,
  ): Promise<MiningHistoryEntry[]> {
    const normalizedBuilderId = builderId.trim();

    if (!normalizedBuilderId) {
      return [];
    }

    const safeLimit = Math.min(
      Math.max(Math.trunc(limit), 1),
      50,
    );

    const { data, error } = await supabase
      .from("builder_reward_ledger")
      .select(
        "id,amount,metadata,entry_type,created_at",
      )
      .eq("builder_id", normalizedBuilderId)
      .eq("reward_type", "builder_mining")
      .eq("entry_type", "credit")
      .order("created_at", { ascending: false })
      .limit(safeLimit)
      .returns<MiningLedgerRow[]>();

    if (error) {
      throw new Error(
        `Mining history could not be loaded: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => {
      const metadata = row.metadata ?? {};

      return {
        id: row.id,
        amountGp: toNumber(row.amount),
        createdAt: row.created_at,
        sessionId: readString(
          metadata,
          "session_id",
        ),
        startedAt: readString(
          metadata,
          "started_at",
        ),
        endsAt: readString(
          metadata,
          "ends_at",
        ),
      };
    });
  },
};

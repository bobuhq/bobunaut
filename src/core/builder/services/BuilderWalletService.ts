import { supabase } from "../../../lib/supabase";

export interface BuilderWalletLedgerRow {
  id: string;
  builder_id: string;
  reward_type: string;
  provider: string | null;
  amount: number | string;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  entry_type?: string | null;
  created_at: string;
}

export interface BuilderWalletEntry {
  id: string;
  type: "credit" | "debit";
  rewardType: string;
  provider: string | null;
  amount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BuilderWalletSnapshot {
  builderId: string;

  /**
   * Authoritative GP Storage v2 balances.
   */
  personalGp: number;
  pendingNetworkGp: number;
  eligibleNetworkGp: number;
  totalGp: number;

  /**
   * Wallet operations remain unavailable until activation.
   * No GP is considered transferable at this stage.
   */
  availableGp: number;
  lockedGp: number;

  lifetimeEarnedGp: number;
  lifetimeSpentGp: number;
  transactionCount: number;
  lastTransactionAt: string | null;
  walletAddress: string | null;
  activated: boolean;
  ledger: BuilderWalletEntry[];
}

const toNumber = (
  value: number | string | null | undefined,
): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const mapLedgerEntry = (
  row: BuilderWalletLedgerRow,
): BuilderWalletEntry => {
  const isDebit = row.entry_type === "debit";

  return {
    id: row.id,
    type: isDebit ? "debit" : "credit",
    rewardType: row.reward_type,
    provider: row.provider,
    amount: toNumber(row.amount),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
};

export const builderWalletService = {
  async load(
    builderId: string,
    ledgerLimit = 25,
  ): Promise<BuilderWalletSnapshot> {
    const normalizedBuilderId = builderId.trim();

    if (normalizedBuilderId.length === 0) {
      throw new Error("Builder ID is required.");
    }

    const safeLedgerLimit = Math.min(
      Math.max(Math.trunc(ledgerLimit), 1),
      100,
    );

    const [
      { data: profile, error: profileError },
      { data: ledgerRows, error: ledgerError },
    ] = await Promise.all([
      supabase
        .from("builder_profiles")
        .select(
          "builder_id,personal_gp,pending_network_gp,eligible_network_gp,gp",
        )
        .eq("builder_id", normalizedBuilderId)
        .maybeSingle<{
          builder_id: string;
          personal_gp: number | string | null;
          pending_network_gp: number | string | null;
          eligible_network_gp: number | string | null;
          gp: number | string | null;
        }>(),

      supabase
        .from("builder_reward_ledger")
        .select(
          "id,builder_id,reward_type,provider,amount,idempotency_key,metadata,entry_type,created_at",
        )
        .eq("builder_id", normalizedBuilderId)
        .order("created_at", { ascending: false })
        .limit(safeLedgerLimit)
        .returns<BuilderWalletLedgerRow[]>(),
    ]);

    if (profileError) {
      throw profileError;
    }

    if (ledgerError) {
      throw ledgerError;
    }

    const ledger = (ledgerRows ?? []).map(mapLedgerEntry);

    const lifetimeEarnedGp = ledger.reduce(
      (total, entry) =>
        entry.type === "credit" ? total + entry.amount : total,
      0,
    );

    const lifetimeSpentGp = ledger.reduce(
      (total, entry) =>
        entry.type === "debit" ? total + entry.amount : total,
      0,
    );

    const personalGp =
      toNumber(profile?.personal_gp);

    const pendingNetworkGp =
      toNumber(profile?.pending_network_gp);

    const eligibleNetworkGp =
      toNumber(profile?.eligible_network_gp);

    const totalGp =
      toNumber(profile?.gp);

    return {
      builderId: normalizedBuilderId,
      personalGp,
      pendingNetworkGp,
      eligibleNetworkGp,
      totalGp,

      /*
       * Wallet activation and migration are not live yet.
       * All currently counted GP remains non-transferable.
       */
      availableGp: 0,
      lockedGp: totalGp,

      lifetimeEarnedGp,
      lifetimeSpentGp,
      transactionCount: ledger.length,
      lastTransactionAt: ledger[0]?.createdAt ?? null,
      walletAddress: null,
      activated: Boolean(profile),
      ledger,
    };
  },
};

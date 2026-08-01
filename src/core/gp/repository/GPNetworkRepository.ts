import { supabase } from "../../../lib/supabase";

export interface GPNetworkBalances {
  personalGp: number;
  pendingNetworkGp: number;
  eligibleNetworkGp: number;
  totalGp: number;
}

interface GPNetworkBalancesRow {
  personal_gp: number | string | null;
  pending_network_gp: number | string | null;
  eligible_network_gp: number | string | null;
  total_gp: number | string | null;
}

const toNonNegativeNumber = (
  value: number | string | null | undefined,
): number => {
  const normalized = Number(value ?? 0);

  if (
    !Number.isFinite(normalized) ||
    normalized < 0
  ) {
    return 0;
  }

  return normalized;
};

export class GPNetworkRepository {
  async loadMine(): Promise<GPNetworkBalances> {
    const { data, error } = await supabase.rpc(
      "get_my_network_gp_balances",
    );

    if (error) {
      throw new Error(
        `Network GP balances could not be loaded: ${error.message}`,
      );
    }

    const normalizedData = Array.isArray(data)
      ? data[0]
      : data;

    if (!normalizedData) {
      throw new Error(
        "Network GP balance query returned no data.",
      );
    }

    const row =
      normalizedData as GPNetworkBalancesRow;

    return {
      personalGp: toNonNegativeNumber(
        row.personal_gp,
      ),
      pendingNetworkGp: toNonNegativeNumber(
        row.pending_network_gp,
      ),
      eligibleNetworkGp: toNonNegativeNumber(
        row.eligible_network_gp,
      ),
      totalGp: toNonNegativeNumber(
        row.total_gp,
      ),
    };
  }
}

export const gpNetworkRepository =
  new GPNetworkRepository();

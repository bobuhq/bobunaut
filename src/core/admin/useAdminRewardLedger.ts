import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminRewardLedgerService,
  type AdminRewardEntryType,
  type AdminRewardLedgerEntry,
} from "./AdminRewardLedgerService";

interface UseAdminRewardLedgerOptions {
  limit?: number;
  offset?: number;
  search?: string;
  entryType?: AdminRewardEntryType | "";
  rewardType?: string;
}

interface UseAdminRewardLedgerResult {
  entries: AdminRewardLedgerEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminRewardLedger(
  options: UseAdminRewardLedgerOptions = {},
): UseAdminRewardLedgerResult {
  const {
    limit = 25,
    offset = 0,
    search = "",
    entryType = "",
    rewardType = "",
  } = options;

  const [entries, setEntries] = useState<
    AdminRewardLedgerEntry[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminRewardLedgerService.getEntries({
          limit,
          offset,
          search,
          entryType,
          rewardType,
        });

      setEntries(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Reward Ledger.";

      setEntries([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    entryType,
    limit,
    offset,
    rewardType,
    search,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    entries,
    loading,
    error,
    refresh,
  };
}

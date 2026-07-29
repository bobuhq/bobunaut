import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminMiningSessionsService,
  type AdminMiningSession,
  type AdminMiningStatus,
} from "./AdminMiningSessionsService";

interface UseAdminMiningSessionsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  status?: AdminMiningStatus | "";
}

interface UseAdminMiningSessionsResult {
  sessions: AdminMiningSession[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminMiningSessions(
  options: UseAdminMiningSessionsOptions = {},
): UseAdminMiningSessionsResult {
  const {
    limit = 25,
    offset = 0,
    search = "",
    status = "",
  } = options;

  const [sessions, setSessions] = useState<
    AdminMiningSession[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminMiningSessionsService.getSessions({
          limit,
          offset,
          search,
          status,
        });

      setSessions(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Mining Sessions.";

      setSessions([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, search, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    sessions,
    loading,
    error,
    refresh,
  };
}

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminAuditLogsService,
  type AdminAuditLogsQuery,
} from "./AdminAuditLogsService";

import type {
  AdminSecurityEvent,
} from "./AdminSecurityService";

export function useAdminAuditLogs(
  query: AdminAuditLogsQuery,
) {
  const [entries, setEntries] =
    useState<AdminSecurityEvent[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminAuditLogsService
          .getAuditLogs(query);

      setEntries(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Audit Logs.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    query.action,
    query.limit,
    query.offset,
    query.search,
    query.severity,
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

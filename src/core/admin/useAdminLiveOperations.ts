import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AdminLiveOperationsService,
  type AdminLiveOperations,
} from "./AdminLiveOperationsService";

const REFRESH_INTERVAL_MS = 30_000;

interface UseAdminLiveOperationsResult {
  operations: AdminLiveOperations | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminLiveOperations():
UseAdminLiveOperationsResult {
  const [operations, setOperations] =
    useState<AdminLiveOperations | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const mountedRef = useRef(true);

  const load = useCallback(
    async (background: boolean) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result =
          await AdminLiveOperationsService
            .getLiveOperations(20);

        if (mountedRef.current) {
          setOperations(result);
        }
      } catch (caughtError: unknown) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load Live Operations.";

        if (mountedRef.current) {
          setError(message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;

    void load(false);

    const intervalId = window.setInterval(() => {
      void load(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [load]);

  return {
    operations,
    loading,
    refreshing,
    error,
    refresh,
  };
}

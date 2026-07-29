import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminMetricsService,
  type AdminDashboardMetrics,
} from "./AdminMetricsService";

interface UseAdminMetricsResult {
  metrics: AdminDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminMetrics(): UseAdminMetricsResult {
  const [metrics, setMetrics] =
    useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminMetricsService.getDashboardMetrics();

      setMetrics(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load admin dashboard metrics.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void AdminMetricsService.getDashboardMetrics()
      .then((result) => {
        if (!mounted) {
          return;
        }

        setMetrics(result);
      })
      .catch((caughtError: unknown) => {
        if (!mounted) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load admin dashboard metrics.";

        setError(message);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AdminAnalyticsService,
  type AdminAnalytics,
} from "./AdminAnalyticsService";

const REFRESH_INTERVAL_MS = 60_000;

export function useAdminAnalytics() {
  const [analytics, setAnalytics] =
    useState<AdminAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const mountedRef = useRef(true);

  const load = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result =
          await AdminAnalyticsService.getAnalytics();

        if (mountedRef.current) {
          setAnalytics(result);
        }
      } catch (caughtError: unknown) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load Analytics.";

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

    void load();

    const intervalId = window.setInterval(() => {
      void load(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [load]);

  return {
    analytics,
    loading,
    refreshing,
    error,
    refresh,
  };
}

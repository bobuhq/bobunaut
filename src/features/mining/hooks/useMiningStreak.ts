import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuthSession } from "../../../core/auth/useAuthSession";

import {
  miningStreakService,
  type MiningStreakSnapshot,
} from "../services/MiningStreakService";

export type MiningStreakHookSnapshot = {
  streak: MiningStreakSnapshot | null;
  loading: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
};

export function useMiningStreak(
  refreshKey: boolean,
): MiningStreakHookSnapshot {
  const {
    authenticated,
    loading: authLoading,
  } = useAuthSession();

  const [streak, setStreak] =
    useState<MiningStreakSnapshot | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const reload = useCallback(
    async (): Promise<void> => {
      if (authLoading) {
        return;
      }

      if (!authenticated) {
        setStreak(null);
        setErrorMessage(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const nextStreak =
          await miningStreakService.load();

        setStreak(nextStreak);
      } catch (error) {
        setStreak(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Mining streak could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    },
    [authenticated, authLoading],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (refreshKey && authenticated) {
      void reload();
    }
  }, [refreshKey, authenticated, reload]);

  return {
    streak,
    loading,
    errorMessage,
    reload,
  };
}

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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
  const [streak, setStreak] =
    useState<MiningStreakSnapshot | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const reload = useCallback(
    async (): Promise<void> => {
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
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (refreshKey) {
      void reload();
    }
  }, [refreshKey, reload]);

  return {
    streak,
    loading,
    errorMessage,
    reload,
  };
}

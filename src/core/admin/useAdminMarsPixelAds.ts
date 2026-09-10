import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminMarsPixelAdsService,
  type AdminMarsPixelAllocation,
} from "./AdminMarsPixelAdsService";

export function useAdminMarsPixelAds(
  enabled = true,
) {
  const [allocations, setAllocations] =
    useState<AdminMarsPixelAllocation[]>([]);

  const [loading, setLoading] =
    useState(enabled);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setAllocations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminMarsPixelAdsService.getAllocations(
          200,
          0,
        );

      setAllocations(result);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Mars Pixel allocations.",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    allocations,
    loading,
    error,
    refresh,
  };
}

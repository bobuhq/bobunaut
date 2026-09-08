import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminMarsPixelAdsService,
  type AdminMarsPixelAdsQuery,
  type AdminMarsPixelCreative,
} from "./AdminMarsPixelAdsService";

export function useAdminMarsPixelAds(
  query: AdminMarsPixelAdsQuery,
) {
  const [creatives, setCreatives] =
    useState<AdminMarsPixelCreative[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminMarsPixelAdsService.getCreatives(query);

      setCreatives(result);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Mars Pixel Ads.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    query.limit,
    query.offset,
    query.status,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    creatives,
    loading,
    error,
    refresh,
  };
}

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminBuilderDetailService,
  type AdminBuilderDetail,
} from "./AdminBuilderDetailService";

interface UseAdminBuilderDetailResult {
  detail: AdminBuilderDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminBuilderDetail(
  builderId: string | null,
): UseAdminBuilderDetailResult {
  const [detail, setDetail] =
    useState<AdminBuilderDetail | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!builderId) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminBuilderDetailService.getBuilderDetail(
          builderId,
        );

      setDetail(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Builder Intelligence.";

      setDetail(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [builderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    detail,
    loading,
    error,
    refresh,
  };
}

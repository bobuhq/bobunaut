import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminBuildersService,
  type AdminBuilder,
} from "./AdminBuildersService";

interface UseAdminBuildersOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

interface UseAdminBuildersResult {
  builders: AdminBuilder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminBuilders(
  options: UseAdminBuildersOptions = {},
): UseAdminBuildersResult {
  const {
    limit = 25,
    offset = 0,
    search = "",
  } = options;

  const [builders, setBuilders] = useState<
    AdminBuilder[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadBuilders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminBuildersService.getBuilders({
          limit,
          offset,
          search,
        });

      setBuilders(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Builders.";

      setBuilders([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, search]);

  useEffect(() => {
    void loadBuilders();
  }, [loadBuilders]);

  return {
    builders,
    loading,
    error,
    refresh: loadBuilders,
  };
}

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminSecurityService,
  type AdminSecurityCenter,
} from "./AdminSecurityService";

interface UseAdminSecurityResult {
  security: AdminSecurityCenter | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminSecurity():
UseAdminSecurityResult {
  const [security, setSecurity] =
    useState<AdminSecurityCenter | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await AdminSecurityService
          .getSecurityCenter(12);

      setSecurity(result);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Security Center.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    security,
    loading,
    error,
    refresh,
  };
}

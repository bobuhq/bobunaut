import { useEffect, useState } from "react";

import { useAuthSession } from "../auth/useAuthSession";
import {
  AdminAccessService,
  type AdminAccess,
} from "./AdminAccessService";

interface UseAdminAccessResult {
  access: AdminAccess | null;
  loading: boolean;
  error: string | null;
  hasAccess: boolean;
}

export function useAdminAccess(): UseAdminAccessResult {
  const {
    session,
    loading: authLoading,
  } = useAuthSession();

  const [access, setAccess] =
    useState<AdminAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (authLoading) {
      return () => {
        mounted = false;
      };
    }

    if (!session?.user.id) {
      setAccess(null);
      setError(null);
      setLoading(false);

      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError(null);

    void AdminAccessService.getMyAccess()
      .then((result) => {
        if (!mounted) {
          return;
        }

        setAccess(result);
      })
      .catch((caughtError: unknown) => {
        if (!mounted) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to verify admin access.";

        setAccess(null);
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
  }, [authLoading, session?.user.id]);

  return {
    access,
    loading: authLoading || loading,
    error,
    hasAccess: Boolean(access?.active),
  };
}

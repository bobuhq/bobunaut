import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuthSession } from "../auth/useAuthSession";
import { useAdminAccess } from "./useAdminAccess";
import {
  AdminSecurityEventService,
} from "./security/AdminSecurityEventService";

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({
  children,
}: AdminRouteProps) {
  const location = useLocation();

  const deniedAccessReportedRef =
    useRef(false);

  const {
    authenticated,
    loading: authLoading,
  } = useAuthSession();

  const {
    loading,
    error,
    hasAccess,
  } = useAdminAccess();

  useEffect(() => {
    if (
      authLoading ||
      loading ||
      !authenticated ||
      error ||
      hasAccess
    ) {
      if (!authenticated || hasAccess) {
        deniedAccessReportedRef.current = false;
      }

      return;
    }

    if (deniedAccessReportedRef.current) {
      return;
    }

    deniedAccessReportedRef.current = true;

    void AdminSecurityEventService
      .reportDeniedAccess();
  }, [
    authenticated,
    authLoading,
    error,
    hasAccess,
    loading,
  ]);

  if (authLoading || loading) {
    return (
      <main className="admin-route-state">
        <div className="admin-route-state__panel">
          <span className="admin-route-state__signal" />
          <p>Verifying command authority…</p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  if (error || !hasAccess) {
    return (
      <main className="admin-route-state">
        <div className="admin-route-state__panel">
          <span className="admin-route-state__eyebrow">
            BOBU SECURITY
          </span>

          <h1>Access denied</h1>

          <p>
            This account does not have permission to
            access the BOBU Control Center.
          </p>

          {error ? <small>{error}</small> : null}

          <a href="/admin/login">
            Return to secure login
          </a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

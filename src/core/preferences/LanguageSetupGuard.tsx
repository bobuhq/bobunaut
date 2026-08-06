import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthSession } from "../auth/useAuthSession";
import { useLanguage } from "../language";
import { usePreferences } from "./usePreferences";

export function LanguageSetupGuard() {
  const location = useLocation();
  const { authenticated, loading: authLoading } =
    useAuthSession();
  const preferences = usePreferences();
  const { t } = useLanguage();

  if (authLoading) {
    return (
      <div className="language-setup-state">
        {t("app.loading")}
      </div>
    );
  }

  /*
   * Guests may continue using public routes. Language onboarding
   * becomes mandatory only after a real Supabase session exists.
   */
  if (!authenticated) {
    return <Outlet />;
  }

  /*
   * Never decide onboarding from the local fallback state.
   * Wait until authenticated preferences have been restored.
   */
  if (
    preferences.source !== "server" &&
    !preferences.lastError
  ) {
    return (
      <div className="language-setup-state">
        {t("app.loading")}
      </div>
    );
  }

  if (
    preferences.source !== "server" &&
    preferences.lastError
  ) {
    return (
      <main className="language-setup-state language-setup-error">
        <p>{t("onboarding.language.restoreError")}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          {t("onboarding.language.retry")}
        </button>
      </main>
    );
  }

  const completed =
    preferences.preferences.languageSetupCompleted;

  if (
    !completed &&
    location.pathname !== "/language-setup"
  ) {
    return (
      <Navigate
        to="/language-setup"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (
    completed &&
    location.pathname === "/language-setup"
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

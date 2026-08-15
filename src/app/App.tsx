import {
  lazy,
  Suspense,
} from "react";
import { AnimatePresence } from "framer-motion";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Shell } from "./Shell";
import { useLanguage } from "../core/language";
import { LanguageSetupGuard } from "../core/preferences";
import { AdminRoute } from "../core/admin/AdminRoute";
const Genesis = lazy(() =>
  import("../features/Genesis").then((module) => ({
    default: module.Genesis,
  })),
);

const Home = lazy(() =>
  import("../features/Home").then((module) => ({
    default: module.Home,
  })),
);

const Missions = lazy(() =>
  import("../features/Missions").then((module) => ({
    default: module.Missions,
  })),
);
const Galaxy = lazy(() =>
  import("../features/Galaxy").then((module) => ({
    default: module.Galaxy,
  })),
);

const BuilderPassport = lazy(() =>
  import(
    "../features/passport/BuilderPassport"
  ).then((module) => ({
    default: module.BuilderPassport,
  })),
);

const BuilderMining = lazy(
  () => import("../features/mining/BuilderMining"),
);
const BuilderIdentity = lazy(
  () => import("../features/identity/BuilderIdentity"),
);

const BuilderWallet = lazy(
  () => import("../features/wallet/BuilderWallet"),
);

const Leaderboard = lazy(
  () => import("../features/leaderboard/Leaderboard"),
);

const AdminDashboard = lazy(
  () => import("../features/admin/AdminDashboard"),
);

const AdminBuilders = lazy(
  () => import("../features/admin/AdminBuilders"),
);

const AdminRewardLedger = lazy(
  () => import("../features/admin/AdminRewardLedger"),
);

const AdminMiningSessions = lazy(
  () => import("../features/admin/AdminMiningSessions"),
);

const AdminSecurityCenter = lazy(
  () => import("../features/admin/AdminSecurityCenter"),
);

const AdminAuditLogs = lazy(
  () => import("../features/admin/AdminAuditLogs"),
);

const AdminAnalytics = lazy(
  () => import("../features/admin/AdminAnalytics"),
);

const AdminLogin = lazy(
  () => import("../features/admin/AdminLogin"),
);

const LanguageSetup = lazy(
  () => import("../features/onboarding/LanguageSetup"),
);

const PrivacyPolicy = lazy(
  () => import("../features/legal/PrivacyPolicy"),
);

const DeleteAccount = lazy(
  () => import("../features/legal/DeleteAccount"),
);

const TermsOfService = lazy(
  () => import("../features/legal/TermsOfService"),
);

const Support = lazy(
  () => import("../features/legal/Support"),
);

const ChildSafety = lazy(
  () => import("../features/legal/ChildSafety"),
);

const GettingStarted = lazy(
  () => import("../features/legal/GettingStarted"),
);
import { BuilderInviteEntry } from "../features/invite/BuilderInviteEntry";

export function App() {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <AnimatePresence mode="wait">
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              display: "grid",
              placeItems: "center",
              color: "rgba(235, 238, 255, 0.72)",
            }}
          >
            {t("app.loading")}
          </div>
        }
      >
        <Routes location={location} key={location.pathname}>
        <Route
          path="/join/:inviteCode"
          element={<BuilderInviteEntry />}
        />

        <Route path="/genesis" element={<Genesis />} />

        <Route
          path="/getting-started"
          element={<GettingStarted />}
        />

        <Route
          path="/support"
          element={<Support />}
        />

        <Route
          path="/child-safety"
          element={<ChildSafety />}
        />

        <Route
          path="/delete-account"
          element={<DeleteAccount />}
        />

        <Route element={<LanguageSetupGuard />}>
          <Route
            path="/language-setup"
            element={<LanguageSetup />}
          />

          <Route element={<Shell />}>
          <Route
            path="/privacy"
            element={<PrivacyPolicy />}
          />

          <Route
            path="/terms"
            element={<TermsOfService />}
          />

          <Route path="/" element={<Home />} />
          <Route path="/identity" element={<BuilderIdentity />} />
          <Route path="/passport" element={<BuilderPassport />} />
          <Route path="/wallet" element={<BuilderWallet />} />
          <Route path="/mining" element={<BuilderMining />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/galaxy" element={<Galaxy />} />
          <Route
            path="/leaderboard"
            element={<Leaderboard />}
          />

          </Route>
        </Route>

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/builders"
          element={
            <AdminRoute>
              <AdminBuilders />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/reward-ledger"
          element={
            <AdminRoute>
              <AdminRewardLedger />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/mining-sessions"
          element={
            <AdminRoute>
              <AdminMiningSessions />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/security"
          element={
            <AdminRoute>
              <AdminSecurityCenter />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/audit-logs"
          element={
            <AdminRoute>
              <AdminAuditLogs />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <AdminAnalytics />
            </AdminRoute>
          }
        />

          <Route
            path="*"
            element={<Navigate to="/genesis" replace />}
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

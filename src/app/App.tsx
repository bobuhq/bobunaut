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
import { Genesis } from "../features/Genesis";
import { Home } from "../features/Home";
import { Deck } from "../features/Deck";
import { Missions } from "../features/Missions";
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
import BuilderIdentity from "../features/identity/BuilderIdentity";
import { BuilderInviteEntry } from "../features/invite/BuilderInviteEntry";

export function App() {
  const location = useLocation();

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
            Loading BOBU Universe…
          </div>
        }
      >
        <Routes location={location} key={location.pathname}>
        <Route
          path="/join/:inviteCode"
          element={<BuilderInviteEntry />}
        />

        <Route path="/genesis" element={<Genesis />} />

        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/command-deck" element={<Deck />} />
          <Route path="/identity" element={<BuilderIdentity />} />
          <Route path="/passport" element={<BuilderPassport />} />
          <Route path="/mining" element={<BuilderMining />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/galaxy" element={<Galaxy />} />
        </Route>

          <Route
            path="*"
            element={<Navigate to="/genesis" replace />}
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

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
import { Galaxy } from "../features/Galaxy";
import { BuilderPassport } from "../features/passport/BuilderPassport";
import BuilderMining from "../features/mining/BuilderMining";

export function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/genesis" element={<Genesis />} />

        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/command-deck" element={<Deck />} />
          <Route path="/passport" element={<BuilderPassport />} />
          <Route path="/mining" element={<BuilderMining />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/galaxy" element={<Galaxy />} />
        </Route>

        <Route path="*" element={<Navigate to="/genesis" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

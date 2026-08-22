import {
  Outlet,
  useLocation,
} from "react-router-dom";
import { Nav } from "../shared/Nav";
import { Stars } from "../shared/Stars";
import { BobuAI } from "../features/ai/BobuAI";

export function Shell() {
  const location = useLocation();

  /*
   * Mars is a dedicated gameplay surface.
   * Global BOBU AI must not appear inside the Mars game.
   */
  const isMarsGame =
    location.pathname === "/mars" ||
    location.pathname.startsWith("/mars/");

  return (
    <div className="app">
      <Stars />
      <Nav />

      <main>
        <Outlet />
      </main>

      {!isMarsGame && <BobuAI />}
    </div>
  );
}

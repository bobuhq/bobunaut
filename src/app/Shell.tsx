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
    location.pathname === "/" ||
    location.pathname === "/mars" ||
    location.pathname.startsWith("/mars/");

  const isMarsExplore =
    location.pathname === "/mars/explore";

  const isNativeMarsBridge =
    isMarsGame &&
    (
      new URLSearchParams(
        location.search,
      ).get("nativeBridge") === "1" ||
      (
        typeof navigator !== "undefined" &&
        navigator.userAgent.includes("BOBU-Mobile")
      )
    );

  return (
    <div className="app">
      {!isMarsExplore && <Stars />}

      {!isMarsExplore && !isNativeMarsBridge && (
        <div
          className="x-account-announcement"
          role="status"
          aria-label="X account update"
        >
          <div className="x-account-announcement__track">
            <span>
              X ACCOUNT UPDATE
              <span className="x-account-announcement__dot"> • </span>
              Our official X account is now{" "}
              <a
                href="https://x.com/bobunaut"
                target="_blank"
                rel="noopener noreferrer"
              >
                @bobunaut
              </a>
              <span className="x-account-announcement__dot"> • </span>
              Having trouble with X verification? Open Genesis and verify your X account again.
              <span className="x-account-announcement__dot"> • </span>
            </span>

            <span aria-hidden="true">
              X ACCOUNT UPDATE
              <span className="x-account-announcement__dot"> • </span>
              Our official X account is now{" "}
              <a
                href="https://x.com/bobunaut"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
              >
                @bobunaut
              </a>
              <span className="x-account-announcement__dot"> • </span>
              Having trouble with X verification? Open Genesis and verify your X account again.
              <span className="x-account-announcement__dot"> • </span>
            </span>
          </div>
        </div>
      )}

      {!isMarsExplore &&
        !isNativeMarsBridge && <Nav />}

      <main
        className={
          isMarsExplore
            ? "mars-explore-main"
            : undefined
        }
      >
        <Outlet />
      </main>

      {!isMarsGame && <BobuAI />}
    </div>
  );
}

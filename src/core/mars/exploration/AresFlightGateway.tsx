import { lazy, Suspense } from "react";
const AuthenticatedAres = lazy(() => import("./MarsExploreWorld").then(m => ({ default: m.MarsExploreWorld })));
/** Flight runs within the authenticated MAIN scene; no iframe or auth transport. */
export function AresFlightGateway() {
  return <Suspense fallback={<div role="status">Loading Ares…</div>}><AuthenticatedAres /></Suspense>;
}

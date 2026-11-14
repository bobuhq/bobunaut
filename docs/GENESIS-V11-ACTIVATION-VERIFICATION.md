# V11 owner activation verification — 2026-11-14

**Production activation: NOT VERIFIED. No production writes or certificate issuance.**

Local release SHA-256: `20e604ae9e75614f5b9ad03a22b5cc024938ad10ea5dd461c0b10d565187b923` (585 manifest inputs). This is a new local release digest; the archived production digest remains `c0bac75b50e908200a52277e416c618855466598f9ca70efe29b8dcefce6ad41` until a deployment is independently verified.

| Actual check | Result |
| --- | --- |
| `npm run test:release` | Exit 0 |
| Unfiltered npm audit at moderate threshold | 0 vulnerabilities |
| V11 tests | 11 passed, 0 skipped |
| Legacy campus safety | 6/6 passed |
| Flight/audio/Mars regressions | 96 passed, 0 skipped |
| OAuth Node including Chrome flow | 24 passed, 0 skipped |
| OAuth Deno security | 29 passed |
| Solana offline payment regressions | 2 passed, 0 skipped; no funds sent |
| Mars coordinate engine | Passed |
| TypeScript and production Vite build | Passed; existing chunk-size advisory remains |
| `npm run test:genesis:sql` | Exit 0; isolated Docker PostgreSQL concurrent issuer, reservation, ABA and lease tests |
| `git diff --check` before commit | Passed |

The new owner-workflow tests run the exact new migration in isolated PGlite PostgreSQL, with genuine production-derived legacy table definitions/constraints and synthetic records. They cover unregistered owner rejection, incomplete proposal rejection, route/site mismatch, immutable review, service-only issuance, first registry publication, same-allocation owner-approved renewal, certificate history, owner withdrawal and replay denial. The complete-footprint test uses the actual height binary and fixed source geometry. The exact surveyed entitlement passes while an entitlement smaller by one micrometre fails. Mission interaction areas protect campus placement without blocking pedestrian access. Actual controller and camera components are exercised by the existing integration harness. These are local implementation checks, not an authenticated production walkthrough.

The Docker SQL result covers the original V11 certification/reservation implementation. The new owner migration has not been applied to Docker staging or hosted staging/production; its legacy table fixture does not reproduce every production legacy trigger. A controlled staging application and genuine authenticated live/device verification are still required before activation.

Read-only production access is available. The fresh `2026-11-14T18:50:15.411853+00:00` snapshot observation matched archived commit `d884aae` exactly: snapshot SHA-256 `dbbd098e6b5b65ab52d0f56a6f2b4bf22ee4298e142d286824a627cf3c866845`, 1 colony, 7 building records, 3 active buildings, 3 landmarks, 4 missions. All required legacy authority registry counts and V11 certificate count remained zero. No genuine player access token was available; no authenticated approval was claimed or simulated against production.

The exact land decision and remaining corridor/landmark evidence are described in `GENESIS-V11-OWNER-ACTIVATION.md` and `genesis-v11-owner-package.json`. No approval has been inferred from the mission request. No routes, entitlement, certification evidence or owner identity have been fabricated. ARES V6, Command Hub, GP, Mining, mission and player data were not changed.

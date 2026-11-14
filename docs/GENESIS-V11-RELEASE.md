# Genesis V11 certification and release

Current owner-activation follow-up: [owner workflow and exact remaining gates](GENESIS-V11-OWNER-ACTIVATION.md). The original release notes below describe the prior implementation; the deployed-code status was subsequently confirmed in the archived production evidence. The new owner workflow is not deployed or activated.

**SERVER_CERTIFIED: false. PRODUCTION_AUTHORIZED: false.**
The code is prepared for review. No production migration, certificate issuance, player mutation, merge or activation has been performed. Publishing the branch and opening a PR do not authorize activation.

## Security follow-up

The original 10 npm findings are fixed. The checked-in lockfile updates the compatible build tools below. Solana web3.js remains pinned to its existing **1.98.4** API; a scoped, exact Jayson 5.0.0 override removes its vulnerable parser/UUID dependencies. The real SDK's Node and browser JSON-RPC clients and the existing payment construction/signing/broadcast path are covered by offline regression tests, including transfer amount, recipient, memo, serialized signatures and enabled preflight. No real transaction is sent.

| Original finding | Severity | Fix |
| --- | --- | --- |
| vite | HIGH | 6.4.3 → 6.4.6 |
| browserslist | HIGH | 4.28.6 → 4.29.5 |
| nanoid | HIGH | 3.3.16 → 3.3.20 |
| source-map-js | HIGH | 1.2.1 → 1.2.2 |
| baseline-browser-mapping | moderate | 2.10.44 → 2.11.37 |
| postcss | moderate | 8.5.20 → 8.5.33 |
| stream-json | moderate | Vulnerable dependency removed by Jayson 5 |
| uuid | moderate | Vulnerable 8.3.2 dependency removed by Jayson 5; other consumers retain a patched version |
| jayson | moderate, inherited | 4.3.0 → 5.0.0, scoped to Solana SDK |
| @solana/web3.js | moderate, inherited | Existing 1.98.4 retained; vulnerable Jayson dependency replaced |

`npm run test:security` runs the unfiltered npm audit and fails at moderate severity or higher. It is part of the complete release suite and the deployment workflow. No audit exceptions or suppressions are configured. The final advisory result is recorded in `genesis-v11-npm-audit.json`; it describes the installed lockfile, not a guarantee against future advisories.

## Certificate and gameplay implementation

The compatibility RPC `get_ares_genesis_placement_v10()` checks authenticated, unambiguous active colony membership and a service-owned V11 certificate. Anonymous callers cannot execute it. Players cannot inspect/write certificates or the global snapshot. Certificate creation requires release/evidence SHA-256 digests, an HTTPS evidence location, a current world snapshot, site inventories and a maximum 24-hour validity period. There are no seed approvals. The service role is explicitly denied delete/truncate privileges even on Supabase installations with broad default grants. Revocation time is server-owned, preventing backdated timestamps from bypassing lease draining.

A successful review returns at most a 60-second browser lease. The client validates colony, release, evidence digest, clock, lease and footprint, then checks the shipped terrain, foundation, ramp and collisions. Reviews run every 12 seconds without overlap; failure or expiry removes the campus. World snapshots include all colonies, buildings, footprint definitions, landmarks and mission catalog entries plus a monotonic epoch. Changes invalidate approval even if geometry later returns to its old state. The epoch writes only while an unrevoked, unexpired certificate exists. Issuance rejects stale snapshots and existing building conflicts. Live reservations reject conflicting building placements and catalog changes; revocation retains protection for outstanding leases for up to 60 seconds. Renewal revokes the previous certificate and inserts a freshly reviewed snapshot in one transaction. Concurrent issuance permits exactly one unrevoked world reservation.

The host now consumes the certified campus collision, walkable-floor, interior-camera and camera-wall constraints. Without approval, the original controller and camera behavior remain. The original Command Hub and its working terminals remain at their existing coordinates; a separately located campus is additive. Hiding the Hub would break the existing mission, research and upgrade entry points, which are still bound to it. No player rows or flight assets/code are reset or replaced. Expiry removes the additive floor/obstacles without changing player X/Z or saved progression.

The unshipped migration `20261114120000_ares_genesis_certification_v11.sql` includes these corrections. Apply it through the controlled staging/migration process; do not replay historical reset/resource-grant migrations.

## What source evidence actually exists

`node scripts/genesis-source-evidence.mjs --write` produces `genesis-v11-source-evidence.json` directly from the shipped modules and height binary. It records source hashes, the world envelope, 532 known fixed collision areas, the three landmark coordinates and their actual survey radius, and real terrain/foundation/ramp checks. It finds no overlap between the V11 envelope and those known fixed areas or landmark survey points. Its local entitlement and reservation inputs are explicitly synthetic geometry-test fixtures. **The report is repository evidence, never production certification.** CI checks it for staleness.

| Evidence | Verified source | What it establishes |
| --- | --- | --- |
| Terrain and scale | `engine/AresGenesisTerrainData.ts`, shipped height binary | Actual local surface sampling and foundation/ramp compatibility |
| Fixed rocks, Hub, host beacon collision | `components/MarsSurfaceRocks.tsx`, `commandhub/AresCommandHubCollision.ts`, `MarsExploreWorld.tsx` | Declared static collision geometry |
| Ridge, Basin, Escarpment | `landmarks/AresExplorationLandmarks.tsx`, migration `20260830170000_create_ares_landmark_discovery_v1.sql` | Three authored survey locations; not legal campus entitlement |
| Mission targets | migration `20260830005000_create_ares_hidden_mission_engine_v1.sql`, runtime mission service | Authored seed target and server-supplied current target; current production contents still require inspection |
| Guidance | `guidance/AresGuidanceSystem.tsx` | Bearings to Hub/terminal/current mission, not a reserved walking corridor inventory |
| Internal campus paths | V11 paving/composition and campus geometry | Local visual/walkable geometry inside the campus; no external route ownership |
| Player occupancy | existing colony RPCs and the new global snapshot | Implemented read/snapshot capability; source alone supplies no current production snapshot |

## Exact production certification blocker

The repository has **no verified current production certificate** for this release. Source geometry can be checked, but cannot establish the current server world, complete protected external walking/entrance routes, dynamic mission access, or legal entitlement to the full campus envelope: X **−585.2…−475.8**, Z **−278.2…−142.8**. No migration or source registry grants that entitlement or supplies a complete authoritative external-route inventory. A normal progression grid and visual guidance bearings are insufficient. Neither an empty array nor a successful local test supplies the missing authority.

A trusted world owner/reviewer must verify a fresh production snapshot and the complete route/mission/fixed-world inventory, establish campus entitlement and reservation ownership, archive genuine evidence at an immutable HTTPS location, then issue a service-role certificate with the matching release digest and evidence hash. Staging must verify the actual schema/auth/RLS, reservation/lease behavior and browser/device behavior against that evidence before activation. No local test result substitutes for these steps. The service role is the trusted issuer: a digest and URL are required provenance fields, not automatic verification of their contents.

To withdraw approval, revoke through the service authority and let the last 60-second browser lease drain before changing conflicting geometry. Keep player buildings, resources, progression and flight intact.

## Verification and Deno scope

`npm run test:release` runs audit, the source/release digest checks, V11 contract/database/terrain/controller/camera tests, legacy safety, ARES flight/audio regressions, OAuth Node/Deno security tests, Solana payment regressions, coordinate verification, TypeScript and production build. `npm run test:genesis:sql` additionally exercises the exact migration on a temporary local Docker PostgreSQL database, including four concurrent issuers, Supabase-style default grants, reservation enforcement, ABA invalidation and backdated revocation. It deletes only its own temporary database. `npm run test:x-oauth:sql` covers the existing isolated OAuth SQL regression and concurrent claims.

The existing `tests/x-oauth/deno.json` and its lockfile are retained because they isolate Edge Function test resolution from the frontend npm workspace. `nodeModulesDir: none` prevents Deno from replacing the npm install; the small scoped lock pins only the Edge test dependencies. The command now uses `--frozen`, so tests cannot rewrite that lock. The unrelated root Deno lock and production Edge Function imports are unchanged.

Final local verification on 2026-11-14 passed: npm audit 0 findings; 7 V11 tests; 6 legacy safety checks; 96 flight/audio regressions; 24 OAuth Node tests including Chrome; 29 Deno security tests; 2 Solana regression tests; coordinate verification; a forced TypeScript build check; and the production build. Both Docker PostgreSQL suites passed, including the V11 four-issuer race and OAuth four-claim race. No release-suite test was skipped.

All test colony/certificate/payment fixtures are synthetic and isolated. PostgreSQL concurrency tests verify the implementation, not production schema or real world authority. Production certification remains explicitly blocked until the external evidence and trusted certificate above exist.

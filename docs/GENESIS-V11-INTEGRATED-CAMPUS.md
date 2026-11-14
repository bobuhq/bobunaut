# Genesis V11 — one integrated ARES campus

The live composition now keeps **one existing AresCommandHub at (−44, −68)** and mounts only the V11 satellite assets around it. `GenesisSharedBaseScene` is no longer imported or rendered by the production campus integration. The standalone scene and its assets remain available to existing previews. No player building is removed, moved, substituted or excluded from collision checks.

## Actual placement

All coordinates are world metres, rotation Y 0, in the existing ARES world. The campus root is (−44, 0, −68); individual decks and paving use the shipped terrain's actual world height. There is no shared elevated station floor or duplicated station shell.

| Component | World X | World Z | Geometry |
| --- | ---: | ---: | --- |
| Existing Command Hub | −44 | −68 | Original component, doorway, stairs, floor, research and mission handlers retained |
| V11 greenhouse | −78 | −72 | Existing `greenhouse-module-0c233d.glb`, scale 2.15, 19 × 11 m conservative footprint |
| V11 habitat/research asset | −23 | −63 | Existing `habitat-dome-8d3499.glb`, scale 1.35, 14 × 14 m conservative footprint |
| Yellow relay | −104 | −60 | Existing relay GLB, animation and beam materials |
| Red relay | −8 | −100 | Existing relay GLB, animation and beam materials |
| Green relay | −8 | −20 | Existing relay GLB, animation and beam materials |
| Courtyard center | −42 | −47 | Terrain-following 12 × 10 m paving |
| Hub approach | −44 | −50.5 | X −45.2…−42.8, Z −56…−45; connects over original terrain to retained Hub stairs |

The exact walking/service branches, lamp positions and **24 separate reservation boxes** are defined in `integrated-campus.mjs` and reproduced in `genesis-v11-owner-package.json`. These boxes include 0.6 m clearance around new objects/paving. They do not grant the bounding rectangle around the campus and do not grant existing player-owned land. The existing Hub is a preserved obstacle at the center, not a newly reserved structure. The obsolete remote V11 envelope remains only in historical standalone-preview geometry/tests; it is rejected by the active browser and new server contract.

## Real geometry and preservation

A read-only production query recovered 3 active building placements: the Hub at grid (0,0), habitat at (0,−3), water at (6,6), with their real definition dimensions and rotations. The four enabled mission targets were recovered in the same read. Sanitized geometry and provenance are recorded in `genesis-v11-integrated-live-geometry.json`; no player identity or raw account snapshot is published. This observation is engineering evidence, not authoritative production entitlement.

The generator uses the shipped height binary, actual terrain sampler, all 532 fixed source obstacle declarations, the observed building footprints and mission interaction areas. No terrain or rock is erased. Both asset foundations pass the existing 1.5 m relief and 12° slope limits: greenhouse relief 1.1841 m / maximum slope 5.2915°; research relief 1.4484 m / maximum slope 6.7089°. A proposed research position at (−8,−64) was rejected before choosing the passing location. Every reservation is sampled on a 0.5 m grid, including paths and relay areas.

The actual GLB bounds are checked, including relay animation sweeps. Physical relay exclusion uses a conservative 4 m radius and 13 m height above terrain. Greenhouse transparency, interior garden visuals, relay pivots, scan timing, colors and beam materials are reused. Satellite assets remain sealed exterior models as before; this change does not invent new enterable interiors or move server interactions out of the existing Hub.

Paving has one shared terrain sampler for rendering and walking. It returns no replacement floor within the original Hub/stair domain. The camera receives only the actual satellite/relay solids, leaving the existing Hub interior logic intact. The original mission, archive, research and mobile-interaction handlers remain on `AresCommandHub` in `MarsExploreWorld`.

A 0.48 m capsule reachability test includes midpoint checks, actual terrain slopes, fixed rocks, live-observed building footprints and all new colliders. It reaches the four observed mission targets and the landing side from the Hub exit. This verifies geometric access, not a legally reserved external corridor inventory.

Flight receives physical heights and ground-only campus reservations. Its current obstacle set refreshes without reconstructing the flight controller, so lease refresh cannot reset the spacecraft. Handoff rechecks the new reservations. A parked craft overlapping the proposed campus immediately hides its additive scene/floors/colliders, and preparation rejects the layout. ARES V6 controls, spacecraft assets, gear, flight physics, player accounts, GP, Mining and mission data are not reset. The local artistic green landing circle is not treated as owner-approved production land.

## Certification contract

The migration `20261114193344_ares_integrated_command_hub_v11.sql` follows the existing V11 certificate and owner-approval migrations. It keeps authentication, owner enrollment, immutable decisions, full world snapshots, monotonic invalidation, lease checks, reservation guards and certificate history.

The active contract requires `site.layout = integrated-command-hub-v11`, placement (−44,−68,0), and exact component reservations. Server and browser reservation arrays are tested for equality. Server building checks test every new component against every live building, including the existing Command Hub, with no building-key exemption. Complete owner-reviewed proposals must carry legal regions, occupied/protected inventories and route provenance.

The owner issuer stores a disjoint `genesis_v11.integrated_allocations` record with the certificate. It does not repurpose the obsolete remote `genesis_v10.entitlement` bounding box or overwrite unrelated legacy authorities. Old proposal/certificate history is retained; it cannot authorize the new topology. Before applying the topology migration, operators must revoke live certificates and drain their outstanding leases. The authenticated compatibility RPC explicitly excludes old layouts. Old release digests also fail the current browser release check.

The owner decision is still required for the precise disjoint allocation and genuine complete world/route/landmark evidence. No owner is enrolled, approval seeded, external route fabricated or certificate issued by these changes.

## Deployment status and remaining blockers

**Local implementation only. No production schema/data writes, certificate issuance, push or deployment has been performed. The integrated campus is not claimed live or activated.**

Production project access was verified through the connected Supabase account for `pvemtnmeewyaqgindocs`. Remaining gates are a complete fresh global world inventory and external-route/landmark extent evidence, explicit BOBU owner approval of the integrated proposal, controlled staging application, deployment of the matching release, genuine certificate issuance and an authenticated live walkthrough/RPC verification. The old distant land proposal must not be approved or reused. `scripts/genesis-live-approval.mjs` remains a read-only verifier requiring a genuine player access token; none was supplied.

Local verification results and the exact changed-file list follow below.

## Final local verification

Final release digest: `b078b759d517ad9bb12489b13274d84d4471c2561cf962be8dcdd5ac8b9bdf98` (590 inputs).

- `npm run test:release`: exit 0; audit 0 vulnerabilities, 19 V11 tests, 6/6 legacy safety checks, 96 flight/Mars regressions, 24 OAuth Node tests including Chrome, 29 Deno checks, 2 offline Solana/payment regressions, coordinate verification, TypeScript and production build. No tests skipped. Existing Vite chunk-size advisory remains.
- `npm run test:genesis:sql`: exit 0 for both isolated Docker PostgreSQL suites. The new complete migration chain permits exactly one of four concurrent owner issuers, returns approved only to the authenticated synthetic fixture, preserves the original Hub row, rejects conflicting placements and denies anonymous RPC access.
- New tests cover actual GLB dimensions and animated relay sweeps, the shipped terrain, observed buildings/missions, capsule reachability, the actual controller with integrated paving, camera walls, landing exclusions, parked craft rejection, obsolete certificate refusal, owner approval/renewal and old lease protection during migration.
- `git diff --check`: passed before commit.

Synthetic test identities/certificates exist only in isolated test databases. No test result is production approval, deployment evidence or an authenticated live campus walkthrough.

## Exact changed files

- `docs/GENESIS-V11-ACTIVATION-VERIFICATION.md`
- `docs/GENESIS-V11-INTEGRATED-CAMPUS.md`
- `docs/GENESIS-V11-OWNER-ACTIVATION.md`
- `docs/GENESIS-V11-RELEASE.md`
- `docs/genesis-v11-integrated-live-geometry.json`
- `docs/genesis-v11-owner-package.json`
- `docs/genesis-v11-source-evidence.json`
- `package.json`
- `scripts/genesis-owner-package.mjs`
- `scripts/genesis-release-manifest.mjs`
- `scripts/genesis-source-evidence.mjs`
- `scripts/genesis-verify-owner-proposal.mjs`
- `scripts/test-genesis-integrated-postgres.mjs`
- `src/core/mars/exploration/MarsExploreWorld.tsx`
- `src/core/mars/exploration/flight/AresFlightSession.tsx`
- `src/core/mars/exploration/flight/CinematicLanding.tsx`
- `src/core/mars/exploration/genesis-v5/3d/campus-layout.d.mts`
- `src/core/mars/exploration/genesis-v5/3d/campus-layout.mjs`
- `src/core/mars/exploration/genesis-v5/AresColonyOccupancyAdapter.ts`
- `src/core/mars/exploration/genesis-v5/AresGenesisCampusIntegration.tsx`
- `src/core/mars/exploration/genesis-v5/IntegratedResearchCampus.tsx`
- `src/core/mars/exploration/genesis-v5/V11ResearchCampus.tsx`
- `src/core/mars/exploration/genesis-v5/V11VisualComposition.tsx`
- `src/core/mars/exploration/genesis-v5/certification.mjs`
- `src/core/mars/exploration/genesis-v5/integrated-campus.d.mts`
- `src/core/mars/exploration/genesis-v5/integrated-campus.mjs`
- `src/core/mars/exploration/genesis-v5/production-site.mjs`
- `src/core/mars/genesis-release.json`
- `supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql`
- `tests/genesis-v11/certification.test.mjs`
- `tests/genesis-v11/host-integration.test.mjs`
- `tests/genesis-v11/integrated-campus.test.mjs`
- `tests/genesis-v11/integrated-sql.test.mjs`
- `tests/genesis-v11/owner-workflow.test.mjs`

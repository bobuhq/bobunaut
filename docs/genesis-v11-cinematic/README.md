# Genesis V11 cinematic campus upgrade

Implemented in the existing production integration component, not GenesisSharedBaseScene or a replacement world. No push, merge, deployment, production RPC, database change, owner decision, or certificate issuance was performed.

## Before / after

| Structure | Before | After |
| --- | --- | --- |
| Original Command Hub (-44,-68) | Existing dome, wings, airlock, stairs and mission/research terminals | Preserved as the single centerpiece; no Hub source changes |
| Research laboratory (-23,-63) | Plain scaled habitat GLB | Preserved GLB with metal material; modular laboratory wings, framed glazing, visible instrument panels, roof heat exchangers, vents, sealed airlock facade, canopy, cyan/purple status strips and facility sign |
| Greenhouse (-78,-72) | All GLB meshes made transparent blue; glowing ribs and plant beds | Glass distinguished from solid frames/hatch hardware; metal ribs, mullions, signed facade, climate equipment, irrigation lines and purple grow lights; existing plants remain visible |
| Courtyard and existing paths | Plain brown paving and seven lamps | Brushed panel texture, recessed joints and batched cyan edge marks on the same paving; existing lamps retained |
| Three relays | Animated dishes and beams | Preserved without relay changes |

The shared metal palette, glazing frames, cyan datum lines, purple accents and signs tie the existing buildings together. The research facade is visible from the Hub approach in `after-approach.png`. The layout retains the certified distances between buildings; no reference image was supplied in this session, so exact visual equivalence to an earlier owner-approved image is not asserted.

## Geometry and authority

Exactly the existing 24 reservation boxes, building positions, decks, collider dimensions, flight obstacles, camera solids and ground samplers remain unchanged. New building details stay inside the sealed building colliders: laboratory 14 x 14 m, 6.75 m above deck; greenhouse 19 x 11 m, 6.45 m above deck. Greenhouse rib tops were lowered slightly to keep the thicker metal tubes below that height. Signs fit inside the same limits. No navigable laboratory/greenhouse interior or entrance interaction was added; original Hub entrance/gameplay remain owned by existing components.

Paving follows the existing production surface sampler. Marks are thin surface details within the original paths. Geometry does not require an expanded reservation or new terrain approval. A changed source release has a new digest, however: the old proposal/certificate cannot authorize it. The normal release-specific certification process must be followed before deployment. Existing authority records and archived access proposal/evidence/registration/observations were left untouched. The derived source evidence, manifest and incomplete review package were regenerated without granting authority.

## Verification

- `npx tsc -b`: passed.
- `npm run test:release`: passed on final sources. Includes dependency audit (zero vulnerabilities), 31 Genesis V11 tests, six V10 release-safety checks, 96 ARES flight/Mars tests, 24 X OAuth Node/browser tests, 29 Deno tests, two Solana regression tests, pixel-coordinate checks, TypeScript and production Vite build. No skipped tests in the successful full run. Existing Vite empty-chunk/large-chunk warnings remain.
- `npm run test:genesis:sql`: both isolated local PostgreSQL suites passed, including concurrent issuance, SQL role restrictions, immutable geometry, protected Hub/player rows, lease/revocation and anonymous denial. No production database was used.
- New `campus-visuals.test.mjs`: checks all modular solid bounds against unchanged width, depth and height, and the 24-box count. Existing tests cover GLB bounds, animated relay sweeps, real terrain, 0.48 m capsule routes to mission targets and landing side, camera constraints, Hub floor/stair ownership and flight exclusions.
- `node tests/genesis-v11/campus-visuals.browser.mjs`: six 1440 x 1000 before/after captures, using actual components and repository terrain. Baseline: `35dd957ee6f01b1d562b816d3ad68de0b4063a1c`. Overview, pedestrian Hub approach, and greenhouse viewpoints. Full original Hub component, no synthetic shared scene. This isolated renderer supplies a null interaction target and an unreachable local backend URL; expected Hub upgrade-fetch errors are captured in `browser-evidence.json`. No authenticated live gameplay, production camera/sky tuning or device frame-rate claim is made.
- `git diff --check`: passed.

The initial full test attempt exposed a release-digest mismatch against the archived proposal. The access-plan regression now checks that unchanged archived evidence is rejected for a changed release; production verification logic and archived proposal were not weakened or rewritten.

## Evidence and reproduction

Compare `before-overview.png` / `after-overview.png`, `before-approach.png` / `after-approach.png`, and `before-greenhouse.png` / `after-greenhouse.png`. `browser-evidence.json` records draw calls, triangle counts, five architectural material batches, baseline and current digest. Counters describe this isolated view, not production performance.

Browser capture requires Playwright (set `PLAYWRIGHT_MODULE` to its `index.mjs`) and system Google Chrome. Run from the repository root. The harness reads the baseline files with `git show`, bundles actual scene components temporarily, serves only loopback assets and writes these evidence files. It never changes production scene selection or authorizes a campus.

## Changed files

- `src/core/mars/exploration/genesis-v5/IntegratedResearchCampus.tsx`: mounts architectural details and wayfinding; detailed paving material.
- `src/core/mars/exploration/genesis-v5/CampusArchitecture.tsx`: shared geometry/material instancing and resource cleanup.
- `src/core/mars/exploration/genesis-v5/campus-architecture.mjs` and `.d.mts`: bounded modular detail specifications.
- `src/core/mars/exploration/genesis-v5/CampusWayfinding.tsx`: facility signs and terrain-following batched path marks.
- `src/core/mars/exploration/genesis-v5/V11ResearchCampus.tsx`: cloned GLB material upgrades.
- `src/core/mars/exploration/genesis-v5/V11VisualComposition.tsx`: greenhouse metal ribs within the existing height.
- `src/core/mars/genesis-release.json`: regenerated source manifest.
- `docs/genesis-v11-source-evidence.json` and `docs/genesis-v11-owner-package.json`: regenerated derived repository evidence, retaining their non-authoritative status.
- `tests/genesis-v11/access-plan.test.mjs`: immutable archived proposal/different release rejection regression.
- `tests/genesis-v11/campus-visuals.test.mjs`: architectural containment checks.
- `tests/genesis-v11/campus-visuals.browser.mjs`: repeatable offline actual-component browser capture.
- `docs/genesis-v11-cinematic/README.md`, `browser-evidence.json`, and six before/after PNGs: report and visual evidence.

# BOBU Genesis V11 — final access plan

## 1. Verified route and landmark plan

This is a NEW owner-reviewable access policy, engineering-verified against the fresh production snapshot at 2026-11-14T20:12:48.176773+00:00, source release b4f0439, actual rendered ARES terrain and unchanged 24 reservations. No historical protected route record is asserted. The approved land allocation, original Hub, paving and campus assets are unchanged.

All external corridors are 1.5 m wide with a 0.48 m capsule. The exact protected bounds below are binary-exact in JavaScript and PostgreSQL. Registration passed the deployed trigger's exact route/site equality check and all proposal constraints. Four mission paths reach their actual 6 m interaction areas; they do not require standing on obstructed center points. The paths reuse the existing courtyard and connect through the retained stairs and paving.

| New route rectangle | Kind | X minimum | X maximum | Z minimum | Z maximum |
| --- | --- | ---: | ---: | ---: | ---: |
| hub-stair-interface | entrance | -44.75 | -43.25 | -59 | -56.625 |
| ares-echo-01-001 | walking | -42.75 | -41.25 | -41.25 | 41.25 |
| ares-echo-01-002 | walking | -88.75 | -41.25 | 39.75 | 41.25 |
| ares-fracture-02-001 | walking | -42.75 | -26.75 | -41.25 | -39.75 |
| ares-fracture-02-002 | walking | -28.25 | -26.75 | -41.25 | -13.75 |
| ares-fracture-02-003 | walking | -28.25 | 49.75 | -15.25 | -13.75 |
| ares-fracture-02-004 | walking | 48.25 | 49.75 | -55.25 | -13.75 |
| ares-fracture-02-005 | walking | 48.25 | 72.75 | -55.25 | -53.75 |
| ares-relay-03-001 | walking | -110.75 | -41.25 | -41.25 | -39.75 |
| ares-relay-03-002 | walking | -110.75 | -109.25 | -69.75 | -39.75 |
| ares-scar-04-001 | walking | -42.75 | -41.25 | -41.25 | 78.25 |
| ares-scar-04-002 | walking | -42.75 | 91.75 | 76.75 | 78.25 |
| landing-access-001 | landing_access | -42.75 | -41.25 | -41.25 | 99.75 |
| landing-access-002 | landing_access | -42.75 | 82.75 | 98.25 | 99.75 |
| landing-access-003 | landing_access | 81.25 | 82.75 | 98.25 | 130.75 |

Exact centerlines, existing paving aliases and campus interface connectors are in [the plan JSON](genesis-v11-access-plan.json). The server's external blockers must not overlap any campus reservation, so internal paving remains identified as campus access rather than being inserted as an external blocker. The 0.15 m transition at the courtyard edge and 0.025 m boundary interval before the Hub approach are included in validated walking connectors; neither is claimed as an old reservation. All five external paths share the interface at (−42,−40.5).

Validation covers all 169 rendered terrain triangles intersecting the 14 external path rectangles, with maximum slope 11.886532° (limit 12°), plus 31264 finite terrain samples. Actual physical obstacles, rotated live building footprints, source rocks, all 24 reservations, rectangle corners and capsule access were checked. The original Hub doorway was checked against its actual wall/furniture colliders; its conservative certificate occupancy remains intact. The existing four-step sampler is retained, with maximum sampled step rise 0.310189 m. Stairs are stepped access, not a claim of a 12° terrain ramp.

| Mission / landing access | Validated endpoint X | Validated endpoint Z | Distance to target |
| --- | ---: | ---: | ---: |
| ares-echo-01 | -88 | 40.5 | 5.3151 m |
| ares-fracture-02 | 72 | -54.5 | 5.3151 m |
| ares-relay-03 | -110 | -69 | 5.3852 m |
| ares-scar-04 | 91 | 77.5 | 5.4083 m |
| landing-access | 82 | 130 | 0.0000 m |

The three circles below are NEW 30 m preservation zones: the source-observed 4 m survey interaction area plus a 26 m no-build/no-landing buffer. They protect a finite surrounding area without claiming a surveyed geological feature perimeter. Pedestrian surveying remains permitted. No new route to landmark survey centers or proof of survey-center reachability is asserted by this campus access plan.

| Landmark | Center X | Center Z | NEW protected radius | Observed survey radius |
| --- | ---: | ---: | ---: | ---: |
| ares-depression-01 | 527.1 | -225.9 | 30 m | 4 m |
| ares-escarpment-01 | 225.9 | -426.7 | 30 m | 4 m |
| ares-ridge-01 | -125.5 | -276.1 | 30 m | 4 m |

Dynamic landing policy retains all existing ARES V6 rules. Each actual touchdown/parking pose must pass the 10 m full-craft radius plus 3 m clearance against physical obstacles, the progression building territory, all 24 campus reservations, these new corridors, mission areas, the three preservation zones and other parked craft. Keep the 500 m flight perimeter, actual four-pad support, relief ≤0.8 m, pad slope ≤6°, tilt ≤5°, handoff and physical overflight checks. Reject any pose without a current clear ground exit to the access network. The departing craft alone may use its own source-defined starboard stair connector; that is not permission for other craft to land over a corridor.

The tested example is (65,130), yaw 0: relief 0.777022 m, maximum pad slope 3.478835°, tilt 2.626701°. Actual V6 handoff is (72.4,130), from the existing disembark source, followed by a validated temporary ground connector to (82,130) outside the 13 m craft safety envelope. This is an example, not a fixed pad or new landing entitlement. New external exclusions remain proposed policy; the deployed flight integration has not been changed to enforce them. No new enforcement is claimed by proposal registration.

The five access-plan tests and six authenticated-operation tests passed, including route collision/slope rejection, capsule traversal, mission coverage, distinct landmark policy, actual V6 support/handoff and exact archive hashing. The existing offline geometry verifier passed. No campus or gameplay source file changed.

## 2. Remaining approval action

The enrolled owner, bobuuniverse@gmail.com, must record the **new access-policy decision** through the existing authenticated server operation. The land allocation is already approved and is not being requested again. The server binds its immutable decision to this complete proposal.

With the existing genuine owner session privately available in GENESIS_PLAYER_ACCESS_TOKEN and the project publishable key in GENESIS_PUBLISHABLE_KEY:

```sh
node scripts/genesis-activation-operation.mjs approve docs/genesis-v11-access-proposal.json docs/genesis-v11-access-evidence.json
```

The command verifies the real Auth identity, exact stored proposal, evidence bytes, geometry and expiry before calling decide_ares_genesis_owner_proposal_v11 with proposal 68b98383-06aa-4e6e-9f23-81c967dc0a31 and approve=true. No manufactured JWT or administrator-injected auth claim is used. A decision and certificate were not issued by this work. Complete owner approval and subsequent required verification must precede service certificate issuance.

## 3. Production registration

**YES — persisted and independently read back in production.** Proposal: `68b98383-06aa-4e6e-9f23-81c967dc0a31`.

Registered under the deployed genesis_v11 contract using the service_role grants, with all insertion constraints and triggers active. A preliminary draft insert failed the exact route/site check because of decimal float serialization; it rolled back. The final policy uses exact fractional bounds and the successful insert is the only persisted proposal from this work.

- Created: 2026-11-14T20:25:51.978+00:00; valid until 2026-11-15T19:25:51.978+00:00.
- Evidence SHA-256: `1eec48242fce9a50716c0abcba2c0f80ddb7118aaeac1b664d5835aececbbf29`.
- Exact archive size: 163956 bytes; production SHA-256 readback matches.
- Matching full world snapshot verified at 2026-11-14T20:26:50.8124+00:00.
- Recorded decisions: 0. Certificates: 0.

[Complete proposal](genesis-v11-access-proposal.json), [exact evidence archive](genesis-v11-access-evidence.json), [production registration readback](genesis-v11-access-registration.json).

The archive's exact UTF-8 bytes are stored in the immutable proposal at inventory.evidenceArchive.content. The deployed owner-only HTTPS getter returns them at JSON pointer /inventory/evidenceArchive/content; the proposal's evidence_uri identifies that endpoint and pointer. The archive itself binds the full private snapshot by SHA-256 while its geometry evidence omits account identities and contribution balances. An attempted GitHub archive upload returned 403 and created no artifact; no GitHub write access was bypassed. The archive is actually persisted in the existing private production proposal instead, requiring no new hosting or schema deployment.

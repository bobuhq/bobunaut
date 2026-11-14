# V11 activation follow-up — 2026-11-14

Activation remains incomplete. No deployment, schema change, production write, certificate issuance or owner impersonation was performed. The original Hub, 24 additions, terrain, flight, buildings, missions, accounts, GP and Mining are unchanged.

The user reports production release `b4f0439` deployed. GitHub resolved it to `b4f04394e4928a0e4e758545649a4fcdaa5526f1`; its [release manifest](https://github.com/bobuhq/bobunaut/blob/b4f0439/src/core/mars/genesis-release.json) matches the verified local digest `b078b759d517ad9bb12489b13274d84d4471c2561cf962be8dcdd5ac8b9bdf98` (590 inputs). These operator additions do not alter manifest inputs or require application redeployment. This checks the source manifest, not bytes served to a browser.

Fresh connected Supabase production observation at `2026-11-14T19:59:31.979224+00:00` confirms the enabled enrolled owner matches `bobuuniverse@gmail.com`; epoch 0; one colony, seven building records, three active buildings, three landmarks, four enabled missions. There are zero proposals, decisions, certificates and external protected-route rows. Sanitized coordinates and counts are in [the observation](genesis-v11-activation-observation.json). The user's campus approval is accepted as task authorization; it does not create the immutable authenticated decision required by the database.

The one historical `genesis_v10.authority_evidence_v2` row is pending, expired `2026-11-13T21:46:58.495683+00:00`, has `routes_inventory=[]`, and explicitly declares routes uncertified and world coverage incomplete. `genesis_v10.site_authority` has zero rows. No recovered production evidence supplies the missing corridors.

## Recovered access and exact missing artifacts

| Item | Recovered evidence | Smallest remaining action |
| --- | --- | --- |
| Existing Hub entrance | Actual collision source: center (−44,−68), 16×18 m, 4 m door. Walkable source: stairs X −45.8…−42.2, Z −59…−57.2, four steps. | Include these source-backed bounds and digest in the reviewed entrance inventory. |
| Entrance to campus | Existing approach paving X −45.2…−42.8, Z −56…−45. Terrain connects the 1.2 m interval from stair end Z −57.2 to paving start −56. | Owner/operator must record the protected connecting corridor's actual width/bounds; paving is not evidence of an external reservation. No layout change is needed. |
| External walking, mission and landing access | Shipped terrain and 532 fixed obstacles are recovered. Actual capsule reachability test reaches all four observed mission targets and landing-side point (110,−70). Guidance gives bearings to targets, not path polygons. Production flight landing positions are dynamic; the cinematic point is not a reserved landing entitlement. | Supply one owner-reviewed complete route inventory with `route_key`, supported `route_kind`, finite `xMin/xMax/zMin/zMax`, and SHA-256 of the actual source/survey artifact for each segment. Include landing access and existing mission paths. State coverage explicitly; do not substitute straight lines or generated test search paths for existing route evidence. |
| Landmark extents | Production and source agree on Ridge (−125.5,−276.1), Basin (527.1,−225.9), Escarpment (225.9,−426.7). Source has 4 m survey interaction radius and 1.39 m marker outer radius. Neither defines the terrain feature extent. Production catalog stores points/classification, without footprint columns. | Supply owner-reviewed feature/protected extent boxes or circles for all three keys, with actual survey/source provenance. Terrain heights alone cannot determine the intended protected boundary. |
| Complete owner proposal | Existing owner package retains exact 24 reservations around (−44,−68); actual terrain and known occupancy checks pass. | After the two missing inventories are supplied, capture a new full `ares_genesis_world_snapshot_v11()`, assemble `occupied` in the existing verifier's exact source/building/extent/mission order, archive genuine evidence at HTTPS, hash its exact bytes, and register the complete proposal. Do not mark the current incomplete package complete. |
| Authenticated approval and live check | Enrollment verified; no genuine owner access token available to this run. | Owner runs the command below locally with their existing genuine session. Do not send tokens in chat or commit them. |

## Authenticated owner operation

`scripts/genesis-activation-operation.mjs` supplements the existing offline verifier without changing the deployed contract. It checks evidence archive bytes against `evidence_digest`, route provenance format and exact site correspondence, positive landmark extents, the original terrain/occupancy verifier, expiry, server-verified Auth email, enrolled-owner RPC access, and equality of the entire stored proposal. It then calls only the immutable owner decision RPC. It neither issues a certificate nor creates a proposal.

With `GENESIS_PUBLISHABLE_KEY` and `GENESIS_PLAYER_ACCESS_TOKEN` set privately from the genuine owner session:

```sh
node scripts/genesis-activation-operation.mjs approve /path/to/stored-reviewed-proposal.json /path/to/exact-evidence-archive
```

The reviewed JSON must be the exact record returned by `get_ares_genesis_owner_proposal_v11`, including database `created_at`. A proposal is registered by a trusted operator through parameterized SQL into private `genesis_v11.proposals`; do not expose that schema to players. Run the offline verifier before registration and run the new operation on the exact fetched record afterward. Completeness/provenance still requires actual recovered artifacts and owner review; hash syntax checks do not establish truth.

Only after complete verification and the genuine recorded decision may the trusted service issuer execute, with the reviewed UUID bound as `$1`:

```sql
select public.issue_ares_genesis_owner_certificate_v11($1::uuid);
```

Server constraints enforce the current snapshot, owner decision, 24 exact reservations, live building collisions, immutable approval and certificate history. This operation has not been executed in production. Next run the existing authenticated read:

```sh
node scripts/genesis-live-approval.mjs
```

Require `status: approved` for the actual colony and matching release digest. Then verify in the owner's authenticated ARES browser that Genesis appears beside the original Hub, walk its entrance and retained mission routes, and exercise V6 flight. Neither the SQL fixture's approved response nor a read using administrator-injected JWT claims is a production result.

## Renewal under the deployed contract

Fresh production constraint inspection confirms both proposals and certificates expire within 24 hours. Certificate updates permit only server-timestamped revocation. A proposal can be issued once. `require_owner_certificate` also binds certificate expiry to the exact approved proposal. Extending an old timestamp, replaying issuance or continuing to display after expiry violates this contract.

The existing supported renewal is a fresh complete proposal with a new UUID, fresh snapshot/evidence, unchanged reviewed route allocation, genuine new owner decision, and service issuance **before** the old certificate expires. The issuer atomically revokes the previous certificate and inserts the replacement; clients poll every 12 seconds with leases capped at 60 seconds. Renew well before expiry (for example begin review two hours early), confirm the real authenticated RPC sees the replacement revision, and alert on failure. Keep the old certificate active while review is pending; never revoke it first. World/epoch changes and collisions must still fail closed.

An unattended recurring renewal facility is not present in the deployed contract. Guaranteeing indefinite unattended visibility requires a narrowly scoped server renewal authorization and scheduler with revocation lineage, owner-enabled checks, unchanged approved allocation/release, fresh world/epoch/collision checks and audit history. That is a separate contract change; this run did not bypass the existing decision requirement or silently apply a migration. Under the requested existing contract, the smallest operational action is to arrange the next genuine owner-reviewed renewal before expiry. Continuous visibility has not been established.

## Verification in this follow-up

- Six new tests: actual fresh production-observed building/mission geometry on shipped terrain, malformed/missing route evidence, invalid landmark extents, exact stored proposal binding, owner identity, expiry, missing/changed archive bytes, offline failure and credential-safe errors. Synthetic transport fixtures never contact production.
- Existing V11 geometry, PGlite contract, controller/camera, GLB bounds, terrain, access, owner workflow and renewal tests passed (19 existing tests).
- Integrated Docker PostgreSQL suite passed: complete migration chain, concurrent issuance, authenticated synthetic fixture RPC, original Hub preservation, reservation collision rejection and anonymous denial.
- 96 flight/Mars regressions and six legacy safety checks passed.
- Release manifest, source evidence and incomplete owner-package reproducibility checks passed. No release digest changed.

No complete production proposal, certificate, approved authenticated production RPC or visible production campus is claimed. The exact blockers are the route inventory, three landmark extents, genuine immutable owner decision, and a scheduled reviewed renewal.

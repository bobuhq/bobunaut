# Production certification observation — 2026-11-14

**NOT CERTIFIED. No certificate issued. Production activation is not authorized.**

This evidence-only record is bound to the existing deployed release, not a rebuild. The JSON file is named by its SHA-256 digest. Verify it with `shasum -a 256 -c SHA256SUMS` from this directory. Use an exact Git commit URL to retrieve the archived bytes; a moving branch URL is not an immutable identifier. Git content addressing detects changes, but does not guarantee permanent repository retention or independently attest the database observations.

## Direct production observations

- The successful GitHub Pages deployment is commit `d06b940812616d9889ad8ce26fe06068caf547b3`, run `43576769230`. Its release digest is `c0bac75b50e908200a52277e416c618855466598f9ca70efe29b8dcefce6ad41`, also present in the served world bundle. Live terrain SHA-256 matches the deployed source. The GitHub Pages artifact digest is recorded; that temporary artifact expires on November 15 and is not the durable evidence archive.
- The server snapshot has 1 colony, 7 building records (3 active and 4 archived), 3 landmarks and 4 missions. The server geometry diagnostic passes its limited active-building/mission/landmark-point checks. Snapshot hash and timestamp are in the JSON. This does not certify complete spatial coverage or landmark extents.
- Production has zero world-coverage records, coordinate mappings, campus entitlements, protected external routes, occupancy reservations, site authorities and V11 certificates. The legacy readiness gate is disabled. Ares sector membership is not a grant to the campus footprint.
- The sole authority-evidence record is pending, expired on November 13, references an older source revision, has an empty route inventory, and explicitly declares server verification and complete-world coverage false. It cannot be reused as valid certification.
- Authenticated users have execute permission on the deployed placement RPC; anonymous users do not. A real anonymous HTTP request returned 401 / SQLSTATE 42501. No authenticated player session was available, and no identity, JWT claim or approved response was fabricated.

## Required authority still missing

The actual world owner/reviewer must supply or approve the real external walking, entrance, landing-access and mission-access corridors, their extents and protection; certify the complete world coordinate mapping/coverage and landmark extents; and grant Bobu Genesis legitimate reservation entitlement to X −585.2…−475.8, Z −278.2…−142.8. The approved plan/grant must identify its authorizing party and provenance. These cannot be inferred from deployment permission or replaced with empty arrays.

Only after those checks pass may the trusted service authority record a release-bound certificate with genuine evidence, then verify approval using a real authorized player session. This record deliberately does not set `server_verified`, `routesReserved`, `placementReserved` or entitlement flags to true, populate authority tables, enable gates, or issue a certificate.

All production operations in this attempt were reads. No buildings, missions, player records, GP, Mining, flight, terrain, schema or application source was modified. The accompanying `inspection.sql` reproduces the core server facts; its hash may change if the world changes after the recorded time.

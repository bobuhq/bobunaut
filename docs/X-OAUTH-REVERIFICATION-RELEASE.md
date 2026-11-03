# X OAuth reverification release

Implementation and local tests are complete. Nothing has been deployed. Neither production nor staging has been changed. Live production preflight and a real X browser round trip remain release checks; fixture results do not establish current production counts.

## Release artifacts

- Reviewed SQL sources: `supabase/sql/x-oauth-reverification/01` through `04`, plus `08_atomic_population_reset.sql`.
- Deployable single transaction: `supabase/migrations/20261103193000_complete_x_oauth_reverification.sql`. It installs the registry, protections, verifier, reward RPC, and administrator-only reset operation. It does **not** call the reset operation or deduct GP.
- Read-only preflight: `supabase/sql/x-oauth-reverification/09_production_preflight.sql`.
- Server: `supabase/functions/claim-x-reward/`, including specific, bounded PostgREST clock-skew retries.
- UI: identity page reconnect control, explicit alternative-login confirmation, identity inspection, X-only unlink, PKCE callback account binding, and all 13 locale dictionaries.

`05_reset_54_x_rewards.sql`, `06_reset_54_x_rewards_atomic.sql`, the old `07` preflight, and `.bak` files are obsolete working artifacts and are **excluded** from the release. Never run them. The generated migration has an exact-source check; regenerate it with `node scripts/build-x-oauth-migration.mjs` after editing reviewed SQL.

## Invariants

The reset snapshots every Auth identity whose provider is `x`, including users with no social row. Under locks, it requires 60 identities, 60 distinct builders and provider IDs, exactly 55 keyed historical OAuth verification credits of 5,000 GP, five users without an OAuth verification credit, and 275,000 GP in OAuth verification credits. `previously_rewarded` is true **only** for an exact historical credit: provider `x`, reward type `social_verification`, entry type `credit`, amount 5,000, and idempotency key `social-verification:x:<that builder UUID>`. A campaign credit alone never qualifies a user or creates a 5,000 GP balance requirement.

OAuth validation covers X `social_verification` and generic `reward_reversal` records, plus any record using the reserved `social-verification:x:` key namespace, even if its provider or reward type is mislabeled. This rejects duplicate/malformed keys, incorrect amounts or entry types, wrong/null/mixed-case providers, previous OAuth reversals, and OAuth records outside the connected population. Generic X reversals remain conservative stop conditions because their reward type alone does not establish an unrelated campaign origin. Mismatched identities, missing profiles, inconsistent social reward flags, invalid totals, and insufficient personal GP for an actual OAuth reversal still abort.

Unrelated X campaign credits are excluded from OAuth classification and preserved in the ledger and balances. The supplied production baseline is **56 X ledger records / 275,500 GP**, consisting of **55 OAuth credits / 275,000 GP** plus this legitimate record:

- Builder: `b0254257-5633-4050-a90d-59160c631e7a`
- Reward type / entry type / amount: `signal_campaign` / `credit` / **500 GP**
- Key: `signal_campaign:d66e8038-6e9b-40ea-8f2e-00a33da2c448:b0254257-5633-4050-a90d-59160c631e7a`

The preflight reports all-X totals, exact OAuth credits, and unrelated rewards separately. All-X totals are informational, rather than the OAuth eligibility gate: another legitimate campaign credit must not change OAuth classification or the reversal total. Reversal postconditions count only the exact reset reversal keys. The expected reversal remains **55 × 5,000 = 275,000 GP**; the 500 GP campaign credit is never reversed.

All 60 users receive an immutable registry binding to their original Auth row and provider ID. Exactly 55 receive append-only debit entries and a personal/total balance decrease of exactly 5,000. Network balances remain unchanged; the five users without OAuth rewards receive no debits, including any campaign-only users. Auth identities are never modified by this operation. X social verification flags are reset. Repeat reset execution fails before additional deductions.

Claims share an administrative release lock and serialize per provider ID and builder profile. They require authoritative Auth proof even for users outside the registry. Registry users must link a different Auth row created strictly after reset time with the **same** original provider ID. Original provider IDs remain reserved across accounts while unlinked. The RPC verifies reversal evidence, then atomically updates the social identity, appends one replacement credit, updates balances, and finalizes the registry state. Ledger idempotency prevents duplicate rewards. Ordinary clients cannot execute the reward or fresh-identity RPC; the service role cannot execute the administrative reset.

The reconnect control never runs on page load. The user confirms they tested another login method; the service checks another linked identity still exists, unlinks only X, and confirms X is gone before relinking. X-only users must first arrange another working sign-in method. A failed redirect leaves a reconnect action available. A changed BOBU account fails the callback check. No client-provided builder/provider input is trusted by the server.

Existing X Follow V2 tables and internal verdict engine are separate. Their RPC remains ungranted to clients and service role. Do not enable a follow-verdict caller as part of this release. Unrelated credit types are outside OAuth classification unless they use a reserved OAuth key; ambiguous generic X reversals still stop validation.

## Local validation

Run from the repository root:

```sh
npx tsc -b --pretty false
npm run build
npm run test:x-oauth
npm run test:x-oauth:sql
deno check supabase/functions/claim-x-reward/index.ts
node scripts/test-mars-pixel-coordinate-engine.mjs
git diff --check
```

The SQL runner uses only `docker exec` against the named local Supabase Postgres container and creates a new `bobu_x_test_<timestamp>` database. It has no production URL or credentials and never runs scripts 05/06. Test databases are retained for inspection. The schema fixture uses actual repository ledger DDL, immutability triggers, and the GP award implementation, with minimal Auth/profile/social schemas. This is not a full production schema clone.

Validated on PostgreSQL 17.6:

| Check | Result |
| --- | --- |
| TypeScript and Vite build | Pass; existing chunk-size and empty vendor chunk warnings |
| Callback, unlink and identity-preservation tests | 9 passed |
| Required translations, all 13 locales | 13 passed |
| Edge handler authentication / forged request / RPC rejection tests | 8 passed |
| Bounded clock-skew retry tests | 3 passed |
| Existing X follow verifier regression tests | 18 passed |
| Combined SQL migration and read-only preflight on fixture | Pass: 56 X records / 275,500 GP; 55 OAuth credits / 275,000 GP; 1 campaign credit / 500 GP |
| Exact production campaign row and its 500 GP | Preserved after reset; full ledger row matches snapshot |
| Additional campaign-only user with 500 personal GP | Preflight/reset pass; no reversal or deduction; fresh OAuth reward paid once |
| Nine suspicious OAuth ledger variants | Both preflight and reset reject every variant; no reset writes survive |
| OAuth/social flag mismatches in either direction | Both preflight and reset reject |
| Existing Mars Pixel coordinate regression suite | Pass |
| Population drift, malformed history, insufficient balance, provider mismatch | Rejected without reset writes |
| Mid-reset injected ledger failure | Entire call rolled back, including registry and debits |
| Actual authenticated-role RPC / registry access | Denied |
| Immutable ledger and registry state checks | Pass |
| Stale, absent, timestamp-boundary, changed-provider and cross-account identities | Rejected |
| Fresh relink and repeated claims for rewarded/unrewarded users | Pass; one replacement credit |
| Four concurrent replacement claims | Exactly one credit; exact final balance |
| Transaction-based rollback rehearsal | All profile, ledger, social and Auth rows restored; empty registry |

Campaign regressions exercise the exact preflight validation block from `09_production_preflight.sql`, not a copied validator. The base fixture includes the supplied campaign builder UUID/key alongside an OAuth credit; a separate transaction adds a campaign-only user. Both scenarios compare campaign ledger rows in full and preserve balances. The campaign-only user retains 500 GP even though that is below 5,000; after fresh linking it receives exactly one first OAuth credit. Negative cases cover duplicates, wrong amount, wrong/null/mixed-case provider, a campaign type under an OAuth key, a debit under an OAuth credit key, and prior/ambiguous reversals. All temporary injections are rolled back without deleting immutable ledger records.

The nine browser-flow service tests run real service modules with a local Auth test port; they do not automate the external X authorization page. No real X credentials or live production queries were used.

## Callback and `JWT issued at future` investigation

The installed Supabase SDK automatically exchanges PKCE callback codes when `detectSessionInUrl` is true, and removes the code from the URL. The old page also exchanged the code, creating competing consumers. The release explicitly enables browser PKCE, lets the SDK own the exchange, waits for session initialization, checks the expected BOBU account against `getUser()`, and shares callback completion across React StrictMode effects. It also resumes a pending workflow when the SDK has already removed the URL code.

`PGRST303: JWT issued at future` concerns token issuance versus validator time. Upstream reports describe clock skew, including gateway-issued JWTs for opaque secret keys. That is a plausible cause, **not a confirmed diagnosis of this production project**. This implementation retries only this exact code/message at 1 and 2 seconds using the same authenticated operation and idempotent RPC. Persistent skew, expired tokens and permission failures still fail closed. It does not change JWT timestamps, accept unsigned tokens, repeatedly refresh tokens, or relax validation.

During the live release check, record UTC request times, error code/message, relevant request IDs and deployed PostgREST version; never log tokens. Check server/gateway/Auth clock alignment and current upstream fixes if the problem persists. The PostgREST changelog lists JWT-time validation fixes in 14.17 and a specific sporadic future-issued JWT fix in 14.18; verify the hosted version and coordinate any platform upgrade separately. Client-clock changes cannot repair a skew between hosted services. Do not treat a successful OAuth login as proof that a later Data API request accepted the JWT.

References: [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [linkIdentity](https://supabase.com/docs/reference/javascript/auth-linkidentity), [upstream clock-skew report](https://github.com/supabase/supabase/issues/50651), [PostgREST changelog](https://github.com/PostgREST/postgrest/blob/main/CHANGELOG.md).

## Production deployment checklist

1. Confirm the target independently from the dashboard and connection hostname: **production `pvemtnmeewyaqgindocs`**. Staging `wzohxrpzyomdrexwcxpv` must remain untouched. The function argument acknowledges the intended target; it cannot prove which database a connection reaches.
2. Review the working-tree diff, generated migration and test results. Do not blanket-apply the SQL directory or blindly push every pending repository migration. Confirm all prerequisite production tables, Auth provider `x`, constraints and `award_builder_gp` match the reviewed baseline.
3. Run `09_production_preflight.sql` using a privileged, explicitly verified production connection with stop-on-error enabled. Before migration, the registry should be absent. Save the counts and balance-validation result. Any mismatch stops the release for investigation; do not edit expected counts to force success.
4. Confirm a restorable backup/PITR point and an approved maintenance window. Pause X claims and other reward/balance writers for the coordinated change. Keep the reset function ungranted to all application roles. Do not mass-unlink identities.
5. Confirm manual identity linking is enabled in production Auth, the X OAuth client configuration is correct, and the exact HTTPS `/identity` redirect is allowlisted. Test a real X OAuth round trip in an isolated approved environment/account before opening the population reset. No staging changes are authorized by this runbook.
6. After all local tests pass, deploy only the reviewed combined migration, the `claim-x-reward` function, and the matching frontend as one maintenance-window release. Explicitly pin every deployment command to the production project. Keep claim traffic paused until all components are verified. No deployment has been performed by this implementation task.
7. Check the deployed RPC grants, registry constraints/triggers, ledger immutability, function secrets and session validation. Do not set `verify_jwt=false` as a workaround for clock skew. Verify ordinary client RPC calls are denied.
8. **Immediately before any deduction**, rerun the read-only preflight. Require 60 connected / 55 OAuth-rewarded / 5 without OAuth rewards / 55 exact historical OAuth credits / 275,000 GP OAuth reversal / empty registry / valid individual balances. Review the separate all-X and unrelated-reward reports against the supplied baseline (56 records / 275,500 GP, including the exact 500 GP campaign row); do not mistake those all-X totals for OAuth counts. Keep traffic paused and save this fresh output for the approval checkpoint below. The reset revalidates the population and balances again while holding locks, so an intervening drift aborts rather than widening the reset.
9. Obtain the explicit approval below. Only then may an administrator open a transaction and call the operation. Do not leave the transaction unattended. Set a short `lock_timeout` (for example 5 seconds) and a bounded `statement_timeout` (for example 60 seconds). The call is:

   ```sql
   SELECT public.reset_x_oauth_population('pvemtnmeewyaqgindocs');
   ```

   This is deliberately not an executable commit script. Before approval, do not run this call on production, even inside a planned rollback transaction.
10. Before committing the approved transaction, inspect the registry (60 pending, 55 previously rewarded), new reversal entries (55, sum 275,000), per-builder personal/total deltas (-5,000 for exactly 55; zero for five), unchanged network balances, unchanged historical OAuth credits, the exact unchanged 500 GP campaign ledger row and retained campaign GP, and unchanged non-X/Auth identity snapshots. Any discrepancy means `ROLLBACK` immediately.
11. Commit only validated results, restore traffic, and monitor new fresh-link claims and duplicate requests. Confirm successful fresh identities produce one replacement credit and complete the registry. Unlinking remains an individual user action. Check all 13 languages, a canceled OAuth redirect, an expired session, an account mismatch, a missing alternative login, and a retry after transient JWT skew.

## Explicit approval checkpoint — not granted

Required approval must identify production `pvemtnmeewyaqgindocs` and authorize **55 personal-GP deductions of 5,000 GP, totaling 275,000 GP, within the 60-user X reset**. The five users without historical OAuth verification rewards receive no deductions, even if they have campaign credits. The 500 GP campaign reward remains untouched. Attach the immediately preceding preflight output, release revision, deployment verification and backup reference. Approval for code implementation or nonfinancial deployment is not approval for these deductions. If fresh validation fails, stop and request a new review; do not continue under this checkpoint.

## Rollback rehearsal and recovery

The automated fixture rehearsal wraps the full reset, fresh-link rewards, idempotency/security checks and local simulated user unlink/relink operations in `BEGIN` / `ROLLBACK`. It compares every ledger/profile/social/Auth row against its snapshot and verifies an empty registry afterward. A separate test injects a failure during ledger insertion after registry creation and verifies statement atomicity. These tests passed. The isolated four-session concurrency test runs afterward in the test database only.

Before a production commit, ordinary transaction `ROLLBACK` restores the complete reset. A production rehearsal that temporarily changes GP is still a production GP operation and requires explicit approval; this task has not performed one.

After commit, never delete historical credits/debits, delete reset records, bypass protection triggers or replay the old reset scripts. Pause claim traffic first. A post-commit financial correction must be a separately reviewed, idempotent **compensating ledger credit** for each still-uncompensated reversal, with account-level reconciliation that accounts for replacement rewards already paid. Completed replacement users and unrewarded users must not receive another 5,000. Do not restore database balances from a stale snapshot over subsequent legitimate rewards. Keep the registry and original identity reservations; if reverting application code, leave X claims disabled rather than reintroducing an insecure legacy RPC. Prepare and approve a dedicated compensating migration from the actual committed ledger state before any financial recovery.

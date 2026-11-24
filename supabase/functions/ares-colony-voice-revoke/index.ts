import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { RoomServiceClient, TwirpError } from "livekit-server-sdk";

// Activation is prohibited until security acceptance.
const WORKER_ENABLED: boolean = true;

const LEASE_EXPIRATION_BATCH_LIMIT = 100;
const LEASE_EXPIRATION_TIMEOUT_MS = 10_000;

const REVOCATION_BATCH_LIMIT = 10;
const REVOCATION_PARALLEL_LIMIT = 5;

const WORKER_EXECUTION_BUDGET_MS = 60_000;
const WORKER_RPC_TIMEOUT_MS = 5_000;
const LIVEKIT_OPERATION_BUDGET_MS = 15_000;

type RevocationJob = {
  queue_id: string;
  claim_token: string;
  colony_id: string;
  builder_id: string;
  generation_id: string;
  room_name: string;
  participant_identity: string;
  attempts: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validJob(job: RevocationJob): boolean {
  return Boolean(
    job &&
      UUID_PATTERN.test(job.queue_id) &&
      UUID_PATTERN.test(job.claim_token) &&
      UUID_PATTERN.test(job.colony_id) &&
      UUID_PATTERN.test(job.builder_id) &&
      UUID_PATTERN.test(job.generation_id) &&
      job.room_name === `ares-colony-${job.colony_id}` &&
      job.participant_identity ===
        `${job.builder_id}:${job.generation_id}` &&
      Number.isInteger(job.attempts) &&
      job.attempts >= 1,
  );
}

function respond(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  fetch: withSupabase(
    { auth: "secret:ares_voice_worker" },
    async (request, ctx): Promise<Response> => {
      if (request.method !== "POST") {
        return respond({
          error: "METHOD_NOT_ALLOWED",
        }, 405);
      }

      if (!WORKER_ENABLED) {
        return respond({
          error: "VOICE_REVOCATION_WORKER_NOT_READY",
        }, 503);
      }

      const livekitUrl = Deno.env.get("LIVEKIT_URL");
      const livekitKey = Deno.env.get("LIVEKIT_API_KEY");
      const livekitSecret = Deno.env.get("LIVEKIT_API_SECRET");

      if (
        !livekitUrl ||
        !livekitUrl.startsWith("wss://") ||
        !livekitKey ||
        !livekitSecret
      ) {
        return respond({
          error: "VOICE_NOT_CONFIGURED",
        }, 503);
      }

      const db = ctx.supabaseAdmin;

      const ownerToken = crypto.randomUUID();

      const deadline = performance.now() + WORKER_EXECUTION_BUDGET_MS;

      let lockAcquired = false;
      let uncertainOperation = false;

      function remainingTime(): number {
        return Math.max(
          0,
          deadline - performance.now(),
        );
      }

      async function boundedRpc(
        name: string,
        args: Record<string, unknown>,
        timeoutMs = WORKER_RPC_TIMEOUT_MS,
        releasing = false,
      ) {
        const budget = releasing
          ? timeoutMs
          : Math.min(timeoutMs, remainingTime());

        if (budget <= 0) {
          throw new Error("WORKER_DEADLINE_EXCEEDED");
        }

        const controller = new AbortController();

        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
          const request = async () =>
            await db.rpc(name, args)
              .abortSignal(controller.signal);

          const timeout = new Promise<never>(
            (_resolve, reject) => {
              timer = setTimeout(() => {
                uncertainOperation = true;
                controller.abort();

                reject(
                  new Error("WORKER_RPC_TIMEOUT"),
                );
              }, budget);
            },
          );

          return await Promise.race([
            request(),
            timeout,
          ]);
        } finally {
          if (timer !== undefined) {
            clearTimeout(timer);
          }
        }
      }

      async function ownsLock(): Promise<boolean> {
        if (
          !lockAcquired ||
          remainingTime() <= 0
        ) {
          return false;
        }

        try {
          const { data, error } = await boundedRpc(
            "ares_voice_check_worker_lock_v1",
            {
              p_owner_token: ownerToken,
            },
          );

          return !error && data === true;
        } catch {
          return false;
        }
      }

      try {
        const {
          data: acquired,
          error: acquireError,
        } = await boundedRpc(
          "ares_voice_acquire_worker_lock_v1",
          {
            p_owner_token: ownerToken,
          },
        );

        if (
          acquireError ||
          typeof acquired !== "boolean"
        ) {
          return respond({
            error: "WORKER_LOCK_ACQUIRE_FAILED",
          }, 503);
        }

        if (!acquired) {
          return respond({
            status: "WORKER_ALREADY_RUNNING",
            processed: 0,
          });
        }

        lockAcquired = true;

        if (!await ownsLock()) {
          return respond({
            error: "WORKER_LOCK_NOT_CONFIRMED",
          }, 503);
        }

        // ARES VOICE AUTOMATIC LEASE EXPIRATION V1

        let expiredLeases = 0;
        let expirationFailed = false;

        try {
          const {
            data: expired,
            error: expirationError,
          } = await boundedRpc(
            "ares_voice_expire_leases_v1",
            {
              p_limit: LEASE_EXPIRATION_BATCH_LIMIT,
            },
            LEASE_EXPIRATION_TIMEOUT_MS,
          );

          if (
            expirationError ||
            typeof expired !== "number" ||
            !Number.isInteger(expired) ||
            expired < 0 ||
            expired > LEASE_EXPIRATION_BATCH_LIMIT
          ) {
            expirationFailed = true;
          } else {
            expiredLeases = expired;
          }
        } catch {
          expirationFailed = true;
        }

        // Existing revocations must remain processable
        // even if the expiration sweep fails.

        const roomService = new RoomServiceClient(
          livekitUrl.replace(/^wss:/, "https:"),
          livekitKey,
          livekitSecret,
          { requestTimeout: 10 },
        );

        if (!await ownsLock()) {
          return respond({
            error: "WORKER_LOCK_LOST",
          }, 503);
        }

        if (
          remainingTime() <
            LIVEKIT_OPERATION_BUDGET_MS
        ) {
          return respond({
            error: "WORKER_EXECUTION_BUDGET_EXHAUSTED",
          }, 503);
        }

        const { data, error } = await boundedRpc(
          "ares_voice_claim_revocations_v1",
          { p_limit: REVOCATION_BATCH_LIMIT },
        );

        if (error || !Array.isArray(data)) {
          return respond({
            error: "QUEUE_CLAIM_FAILED",
          }, 503);
        }

        if (data.length === 0) {
          return respond({
            status: expirationFailed
              ? "LEASE_EXPIRATION_FAILED"
              : "QUEUE_EMPTY",
            processed: 0,
            expiredLeases,
            expirationFailed,
          }, expirationFailed ? 503 : 200);
        }

        if (data.length > REVOCATION_BATCH_LIMIT) {
          return respond({
            error: "INVALID_QUEUE_RESPONSE",
          }, 503);
        }

        const jobs = data as RevocationJob[];

        const queueIds = new Set<string>();
        const claimTokens = new Set<string>();

        for (const job of jobs) {
          if (
            !validJob(job) ||
            queueIds.has(job.queue_id) ||
            claimTokens.has(job.claim_token)
          ) {
            return respond({
              error: "INVALID_QUEUE_BATCH",
            }, 503);
          }

          queueIds.add(job.queue_id);
          claimTokens.add(job.claim_token);
        }

        async function processJob(
          job: RevocationJob,
        ): Promise<Response> {
          if (
            remainingTime() <
              LIVEKIT_OPERATION_BUDGET_MS
          ) {
            return respond({
              error: "WORKER_EXECUTION_BUDGET_EXHAUSTED",
            }, 503);
          }

          if (!await ownsLock()) {
            return respond({
              error: "WORKER_LOCK_LOST",
            }, 503);
          }

          const claim = {
            p_queue_id: job.queue_id,
            p_claim_token: job.claim_token,
          };

          async function retry(
            code: string,
          ): Promise<Response> {
            const { data, error } = await boundedRpc(
              "ares_voice_retry_revocation_v1",
              {
                ...claim,
                p_error_code: code,
              },
            );

            if (error || data !== true) {
              return respond({
                error: "RETRY_NOT_CONFIRMED",
              }, 503);
            }

            return respond({
              status: "RETRY_SCHEDULED",
              processed: 0,
              expiredLeases,
              expirationFailed,
            }, 503);
          }

          async function complete(
            result: string,
          ): Promise<Response> {
            const { data, error } = await boundedRpc(
              "ares_voice_complete_revocation_v1",
              {
                ...claim,
                p_result: result,
              },
            );

            if (error || data !== true) {
              return respond({
                error: "COMPLETION_NOT_CONFIRMED",
              }, 503);
            }

            return respond({
              status: result.toUpperCase(),
              processed: 1,
              expiredLeases,
              expirationFailed,
            }, expirationFailed ? 503 : 200);
          }

          try {
            const {
              data: verdict,
              error: checkError,
            } = await boundedRpc(
              "ares_voice_revalidate_revocation_v1",
              claim,
            );

            if (checkError) {
              return await retry(
                "MEMBERSHIP_CHECK_FAILED",
              );
            }

            if (verdict === "CLAIM_INVALID") {
              return respond({
                error: "CLAIM_INVALID",
              }, 409);
            }

            if (verdict === "MEMBERSHIP_REACTIVATED") {
              return await complete(
                "membership_reactivated",
              );
            }

            if (verdict !== "REVOCATION_REQUIRED") {
              return await retry(
                "MEMBERSHIP_CHECK_FAILED",
              );
            }

            if (!await ownsLock()) {
              return respond({
                error: "WORKER_LOCK_LOST",
              }, 503);
            }

            if (
              remainingTime() <
                LIVEKIT_OPERATION_BUDGET_MS
            ) {
              return respond({
                error: "WORKER_EXECUTION_BUDGET_EXHAUSTED",
              }, 503);
            }

            try {
              // Revoke the exact retired membership generation.
              // Small forward offset covers same-second token issuance.
              const revokeTokenTs = BigInt(
                Math.floor(Date.now() / 1000) + 5,
              );

              await roomService.removeParticipant(
                job.room_name,
                job.participant_identity,
                { revokeTokenTs },
              );
            } catch (error) {
              uncertainOperation = true;

              if (error instanceof TwirpError) {
                if (error.code === "not_found") {
                  return await retry(
                    "LIVEKIT_REMOVE_FAILED",
                  );
                }

                if (error.code === "resource_exhausted") {
                  return await retry(
                    "LIVEKIT_RATE_LIMIT",
                  );
                }

                if (error.code === "unavailable") {
                  return await retry(
                    "LIVEKIT_UNAVAILABLE",
                  );
                }

                if (error.code === "deadline_exceeded") {
                  return await retry(
                    "LIVEKIT_TIMEOUT",
                  );
                }
              }

              return await retry(
                "LIVEKIT_REMOVE_FAILED",
              );
            }

            return await complete(
              "participant_removed",
            );
          } catch {
            return await retry(
              "WORKER_INTERNAL_ERROR",
            );
          }
        }

        // A failure in one generation must not interrupt
        // independent revocation jobs.

        let completed = 0;
        let retryScheduled = 0;
        let failed = 0;
        let invalidClaims = 0;

        for (
          let offset = 0;
          offset < jobs.length;
          offset += REVOCATION_PARALLEL_LIMIT
        ) {
          if (
            remainingTime() <
              LIVEKIT_OPERATION_BUDGET_MS ||
            !await ownsLock()
          ) {
            failed += jobs.length - offset;
            break;
          }

          const batch = jobs.slice(
            offset,
            offset + REVOCATION_PARALLEL_LIMIT,
          );

          const results = await Promise.allSettled(
            batch.map(async (job) => {
              const response = await processJob(job);

              return {
                httpStatus: response.status,
                body: await response.json() as {
                  status?: string;
                  error?: string;
                  processed?: number;
                },
              };
            }),
          );

          for (const result of results) {
            if (result.status === "rejected") {
              failed++;
              continue;
            }

            const { httpStatus, body } = result.value;

            if (body.processed === 1) {
              completed++;
              continue;
            }

            if (body.status === "RETRY_SCHEDULED") {
              retryScheduled++;
              continue;
            }

            if (
              httpStatus === 409 &&
              body.error === "CLAIM_INVALID"
            ) {
              invalidClaims++;
              continue;
            }

            failed++;
          }
        }

        const degraded = expirationFailed ||
          retryScheduled > 0 ||
          invalidClaims > 0 ||
          failed > 0;

        return respond({
          status: degraded ? "BATCH_PARTIAL_FAILURE" : "BATCH_COMPLETED",
          claimed: jobs.length,
          processed: completed,
          retryScheduled,
          invalidClaims,
          failed,
          expiredLeases,
          expirationFailed,
        }, degraded ? 503 : 200);
      } catch {
        return respond({
          error: "WORKER_EXECUTION_FAILED",
        }, 503);
      } finally {
        if (lockAcquired && !uncertainOperation) {
          try {
            const {
              data: released,
              error: releaseError,
            } = await boundedRpc(
              "ares_voice_release_worker_lock_v1",
              {
                p_owner_token: ownerToken,
              },
              WORKER_RPC_TIMEOUT_MS,
              true,
            );

            if (
              releaseError ||
              released !== true
            ) {
              console.warn(
                "ARES_VOICE_WORKER_LOCK_RELEASE_UNCONFIRMED",
              );
            }
          } catch {
            console.warn(
              "ARES_VOICE_WORKER_LOCK_RELEASE_UNCONFIRMED",
            );
          }
        }

        if (
          lockAcquired &&
          uncertainOperation
        ) {
          console.warn(
            "ARES_VOICE_WORKER_LOCK_RETAINED_UNTIL_EXPIRATION",
          );
        }
      }
    },
  ),
};

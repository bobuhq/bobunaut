import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type MiningAction =
  | "start"
  | "claim";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
    },
  });
}

function getClientIp(req: Request): string | null {
  const connectingIp =
    req.headers.get("cf-connecting-ip")
      ?.trim();

  if (connectingIp) {
    return connectingIp;
  }

  return (
    req.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ??
    null
  );
}

async function emitSecurityAlert(
  supabaseUrl: string,
  alertSecret: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/security-alert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BOBU-Security-Secret":
            alertSecret,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      console.error(
        "Mining security alert delivery failed:",
        response.status,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(
      "Mining security alert exception:",
      error,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405,
    );
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const alertSecret =
    Deno.env.get("BOBU_SECURITY_ALERT_SECRET");

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey ||
    !alertSecret
  ) {
    console.error(
      "Mining security gateway environment incomplete.",
    );

    return jsonResponse(
      {
        error:
          "Mining security service is unavailable.",
      },
      500,
    );
  }

  const authHeader =
    req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(
      { error: "Unauthorized." },
      401,
    );
  }

  const userClient = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      { error: "Unauthorized." },
      401,
    );
  }

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const body =
    await req.json().catch(() => ({}));

  const action =
    typeof body?.action === "string"
      ? body.action.trim()
      : "";

  if (
    action !== "start" &&
    action !== "claim"
  ) {
    return jsonResponse(
      {
        error:
          "Invalid mining action.",
      },
      400,
    );
  }

  const miningAction =
    action as MiningAction;

  const rpcName =
    miningAction === "start"
      ? "start_builder_mining"
      : "claim_builder_mining";

  const {
    error: miningError,
  } = await userClient.rpc(
    rpcName,
  );

  if (miningError) {
    const message =
      miningError.message ??
      "UNKNOWN_MINING_ERROR";

    const normalized =
      message.toLowerCase();

    /*
     * Known suspicious classes:
     * - repeated activation while already active
     * - claim before completion
     * - duplicate / already claimed reward attempts
     *
     * Database remains the authority. This gateway
     * only adds telemetry and alerting.
     */
    /*
     * These are normal mining state conflicts.
     *
     * Examples:
     * - Builder presses Start while an active or
     *   completed-unclaimed session already exists.
     * - Builder presses Claim before a completed
     *   session is available.
     *
     * A single occurrence is NOT a security event.
     * Database constraints remain authoritative.
     */
    const startStateConflict =
      message.includes(
        "Claim your completed mining session before starting a new one",
      );

    const claimStateConflict =
      message.includes(
        "No completed mining session is available to claim",
      );

    const normalStateConflict =
      startStateConflict ||
      claimStateConflict;

    const abuseReason =
      startStateConflict
        ? "start_existing_session"
        : claimStateConflict
          ? "claim_no_completed_session"
          : null;

    /*
     * Unexpected database/auth/integrity failures are
     * security-relevant because they are outside the
     * normal mining state machine.
     */
    const authenticationFailure =
      normalized.includes(
        "authentication is required",
      );

    const integrityFailure =
      normalized.includes("duplicate key") ||
      normalized.includes(
        "unique constraint",
      ) ||
      normalized.includes(
        "idempotency",
      ) ||
      normalized.includes(
        "reward ledger",
      );

    if (
      authenticationFailure ||
      integrityFailure
    ) {
      await emitSecurityAlert(
        supabaseUrl,
        alertSecret,
        {
          eventType:
            integrityFailure
              ? "mining_integrity_violation"
              : "mining_authentication_violation",
          severity:
            integrityFailure
              ? "critical"
              : "warning",
          source:
            "mining-security-gateway",
          actorUserId: user.id,
          sourceIp:
            getClientIp(req),
          action:
            miningAction === "start"
              ? "mining_start_rejected"
              : "mining_claim_rejected",
          metadata: {
            rpc: rpcName,
            errorCode:
              miningError.code ?? null,
          },
        },
      );
    } else if (
      normalStateConflict &&
      abuseReason
    ) {
      /*
       * One ordinary state conflict is harmless.
       * Repeated identical rejected actions are counted
       * server-side to detect automation / abuse.
       */
      const {
        data: abuseCount,
        error: abuseError,
      } = await adminClient.rpc(
        "record_mining_security_attempt",
        {
          p_builder_id: user.id,
          p_action: miningAction,
          p_reason: abuseReason,
          p_source_ip:
            getClientIp(req),
          p_window_seconds: 300,
        },
      );

      if (abuseError) {
        /*
         * Telemetry failure must never change the
         * authoritative Mining RPC result.
         */
        console.error(
          "Mining abuse counter failed:",
          abuseError,
        );
      } else {
        const count =
          Number(abuseCount ?? 0);

        if (
          count === 8 ||
          count === 15
        ) {
          const critical =
            count === 15;

          await emitSecurityAlert(
            supabaseUrl,
            alertSecret,
            {
              eventType:
                critical
                  ? "mining_abuse_critical"
                  : "mining_abuse_warning",
              severity:
                critical
                  ? "critical"
                  : "warning",
              source:
                "mining-security-gateway",
              actorUserId: user.id,
              sourceIp:
                getClientIp(req),
              count,
              window:
                "5 minutes",
              action:
                miningAction === "start"
                  ? "repeated_mining_start_rejected"
                  : "repeated_mining_claim_rejected",
              metadata: {
                rpc: rpcName,
                reason: abuseReason,
                warningThreshold: 8,
                criticalThreshold: 15,
              },
            },
          );
        }
      }
    } else if (!normalStateConflict) {
      /*
       * Unknown mining failures are logged server-side
       * for investigation but do not immediately create
       * Telegram noise.
       */
      console.error(
        "Unexpected mining RPC failure:",
        {
          action: miningAction,
          rpc: rpcName,
          code:
            miningError.code ?? null,
          message,
          userId: user.id,
        },
      );
    }

    return jsonResponse(
      {
        error: message,
        code:
          miningError.code ?? null,
      },
      409,
    );
  }

  return jsonResponse({
    accepted: true,
    action: miningAction,
  });
});

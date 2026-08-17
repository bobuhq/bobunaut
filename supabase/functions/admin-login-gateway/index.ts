import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const WINDOW_MINUTES = 5;
const WARNING_THRESHOLD = 5;
const BLOCK_THRESHOLD = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function response(
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

function getClientIp(req: Request): string {
  const connecting =
    req.headers.get("cf-connecting-ip")?.trim();

  if (connecting) {
    return connecting;
  }

  const forwarded =
    req.headers.get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();

  return forwarded || "0.0.0.0";
}

async function sha256(value: string): Promise<string> {
  const bytes =
    new TextEncoder().encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function emitAlert(
  supabaseUrl: string,
  alertSecret: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const alertResponse = await fetch(
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

    if (!alertResponse.ok) {
      console.error(
        "Admin login security alert failed:",
        alertResponse.status,
      );
    }
  } catch (error) {
    /*
     * Telemetry must never become the
     * authentication authority.
     */
    console.error(
      "Admin login alert exception:",
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
    return response(
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
      "Admin login gateway environment incomplete.",
    );

    return response(
      { error: "Server configuration incomplete." },
      500,
    );
  }

  let body: {
    identifier?: unknown;
    password?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return response(
      { error: "Invalid request." },
      400,
    );
  }

  const identifier =
    typeof body.identifier === "string"
      ? body.identifier.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (
    !identifier ||
    !password ||
    identifier.length > 254 ||
    password.length > 1024
  ) {
    return response(
      { error: "Invalid administrator credentials." },
      400,
    );
  }

  const adminDomain =
    Deno.env.get("ADMIN_USERNAME_DOMAIN") ??
    "admin.bobunaut.com";

  const email =
    identifier.includes("@")
      ? identifier
      : `${identifier}@${adminDomain}`;

  const identifierHash =
    await sha256(email);

  const sourceIp =
    getClientIp(req);

  const adminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  const {
    data: reservationRows,
    error: reservationError,
  } = await adminClient.rpc(
    "reserve_admin_login_attempt",
    {
      p_source_ip: sourceIp,
      p_identifier_hash:
        identifierHash,
      p_window_seconds:
        WINDOW_MINUTES * 60,
      p_block_threshold:
        BLOCK_THRESHOLD,
    },
  );

  if (reservationError) {
    console.error(
      "Admin login reservation failed:",
      reservationError,
    );

    return response(
      { error: "Authentication unavailable." },
      503,
    );
  }

  const reservation =
    Array.isArray(reservationRows)
      ? reservationRows[0]
      : reservationRows;

  if (!reservation?.attempt_id) {
    console.error(
      "Admin login reservation returned no attempt.",
    );

    return response(
      { error: "Authentication unavailable." },
      503,
    );
  }

  const attemptId =
    String(reservation.attempt_id);

  const currentFailures =
    Number(
      reservation.failure_count ?? 0,
    );

  if (reservation.allowed !== true) {
    await emitAlert(
      supabaseUrl,
      alertSecret,
      {
        eventType:
          "admin_login_bruteforce_blocked",
        severity: "critical",
        source: "admin-login-gateway",
        sourceIp,
        count: currentFailures,
        window:
          `${WINDOW_MINUTES} minutes`,
        action: "login_blocked",
        metadata: {
          threshold: BLOCK_THRESHOLD,
        },
      },
    );

    return response(
      {
        error:
          "Too many administrator login attempts. Try again later.",
        code:
          "ADMIN_LOGIN_RATE_LIMITED",
      },
      429,
    );
  }

  /*
   * Credentials are used only for this Supabase
   * Auth request. They are never stored or logged.
   */
  const authClient =
    createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  const {
    data: loginData,
    error: loginError,
  } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (
    loginError ||
    !loginData.user ||
    !loginData.session
  ) {
    const nextFailureCount =
      currentFailures;

    if (
      nextFailureCount >= WARNING_THRESHOLD
    ) {
      await emitAlert(
        supabaseUrl,
        alertSecret,
        {
          eventType:
            nextFailureCount >=
            BLOCK_THRESHOLD
              ? "admin_login_bruteforce_critical"
              : "admin_login_bruteforce_warning",
          severity:
            nextFailureCount >=
            BLOCK_THRESHOLD
              ? "critical"
              : "warning",
          source:
            "admin-login-gateway",
          sourceIp,
          count: nextFailureCount,
          window:
            `${WINDOW_MINUTES} minutes`,
          action:
            "failed_login_detected",
          metadata: {
            warningThreshold:
              WARNING_THRESHOLD,
            blockThreshold:
              BLOCK_THRESHOLD,
          },
        },
      );
    }

    return response(
      {
        error:
          "Invalid administrator credentials.",
      },
      401,
    );
  }

  /*
   * A valid Supabase account is not automatically
   * an administrator.
   */
  const {
    data: adminAccess,
    error: adminAccessError,
  } = await adminClient
    .from("admin_users")
    .select("user_id, role, active")
    .eq(
      "user_id",
      loginData.user.id,
    )
    .maybeSingle();

  if (
    adminAccessError ||
    !adminAccess?.active
  ) {
    await emitAlert(
      supabaseUrl,
      alertSecret,
      {
        eventType:
          "admin_login_non_admin_account",
        severity: "warning",
        source: "admin-login-gateway",
        actorUserId:
          loginData.user.id,
        sourceIp,
        action:
          "login_rejected",
      },
    );

    return response(
      {
        error:
          "Invalid administrator credentials.",
      },
      401,
    );
  }

  const {
    error: successMarkError,
  } = await adminClient.rpc(
    "mark_admin_login_attempt_success",
    {
      p_attempt_id: attemptId,
    },
  );

  if (successMarkError) {
    console.error(
      "Admin successful login marking failed:",
      successMarkError,
    );
  }

  return response({
    accepted: true,
    session: {
      access_token:
        loginData.session.access_token,
      refresh_token:
        loginData.session.refresh_token,
    },
  });
});

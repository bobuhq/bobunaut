import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    headers: corsHeaders,
  });
}

function getClientIp(req: Request): string | null {
  const connectingIp =
    req.headers.get("cf-connecting-ip")?.trim();

  if (connectingIp) {
    return connectingIp;
  }

  const forwarded =
    req.headers.get("x-forwarded-for");

  return forwarded
    ?.split(",")[0]
    ?.trim() || null;
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

  try {
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
        "Admin security environment incomplete.",
      );

      return jsonResponse(
        { error: "Server configuration incomplete." },
        500,
      );
    }

    const authHeader =
      req.headers.get("Authorization");

    /*
     * Anonymous /admin page visits are intentionally
     * not alerts. Public scanners would otherwise
     * create unnecessary security noise.
     */
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({
        accepted: true,
        alerted: false,
        reason: "anonymous_request",
      });
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
      /*
       * Invalid tokens are not trusted enough to
       * attach an actor identity.
       */
      return jsonResponse(
        {
          accepted: false,
          alerted: false,
          reason: "invalid_session",
        },
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

    const {
      data: adminAccess,
      error: adminError,
    } = await adminClient
      .from("admin_users")
      .select("user_id, role, active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) {
      console.error(
        "Admin authority lookup failed:",
        adminError,
      );

      return jsonResponse(
        { error: "Authority verification failed." },
        500,
      );
    }

    /*
     * Legitimate active Control Center users must
     * never generate intrusion alerts.
     */
    if (adminAccess?.active === true) {
      return jsonResponse({
        accepted: true,
        alerted: false,
        reason: "authorized_admin",
      });
    }

    const sourceIp = getClientIp(req);

    const alertResponse = await fetch(
      `${supabaseUrl}/functions/v1/security-alert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BOBU-Security-Secret":
            alertSecret,
        },
        body: JSON.stringify({
          eventType:
            "admin_console_access_denied",
          severity: "warning",
          source: "admin-security-event",
          actorUserId: user.id,
          sourceIp,
          action: "access_denied",
          metadata: {
            reason: adminAccess
              ? "inactive_admin_account"
              : "non_admin_account",
            attemptedPath: "/admin",
          },
        }),
      },
    );

    if (!alertResponse.ok) {
      console.error(
        "Admin security alert delivery failed:",
        alertResponse.status,
        await alertResponse.text(),
      );

      /*
       * Telemetry failure must not turn an
       * unauthorized user into an authorized one.
       */
      return jsonResponse({
        accepted: true,
        alerted: false,
        reason: "alert_delivery_failed",
      });
    }

    return jsonResponse({
      accepted: true,
      alerted: true,
    });
  } catch (error) {
    console.error(
      "admin-security-event failed:",
      error,
    );

    return jsonResponse(
      { error: "Admin security event failed." },
      500,
    );
  }
});

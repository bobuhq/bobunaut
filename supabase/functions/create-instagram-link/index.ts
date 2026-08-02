import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateInstagramLinkRequest {
  return_url?: unknown;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

async function sha256(
  value: string,
): Promise<string> {
  const encoded =
    new TextEncoder().encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoded,
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function normalizeOrigin(
  value: string,
): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new Error(
      "Return URL must use HTTPS.",
    );
  }

  return url.origin;
}

export default {
  async fetch(req: Request): Promise<Response> {
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
      Deno.env.get(
        "SUPABASE_PUBLISHABLE_KEY",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const instagramAppId =
      Deno.env.get("INSTAGRAM_APP_ID");

    const instagramRedirectUri =
      Deno.env.get(
        "INSTAGRAM_REDIRECT_URI",
      );

    const siteUrl =
      Deno.env.get("BOBU_SITE_URL") ??
      "https://bobunaut.com";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Required Supabase configuration is missing.",
      );

      return jsonResponse(
        {
          error:
            "Instagram connection service is not configured.",
        },
        500,
      );
    }

    /*
     * Instagram configuration may intentionally be absent
     * until the Meta application has been created.
     */
    if (
      !instagramAppId ||
      !instagramRedirectUri
    ) {
      return jsonResponse(
        {
          configured: false,
          error:
            "Instagram connection is not configured yet. No GP has been awarded.",
        },
        503,
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      return jsonResponse(
        {
          error:
            "Authentication is required.",
        },
        401,
      );
    }

    const accessToken =
      authorization.slice(7).trim();

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
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
    } = await userClient.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      console.error(
        "Instagram connection authentication failed:",
        userError?.message ?? "No user.",
      );

      return jsonResponse(
        {
          error:
            "Your session is invalid or has expired.",
        },
        401,
      );
    }

    let body: CreateInstagramLinkRequest = {};

    try {
      body =
        await req.json() as CreateInstagramLinkRequest;
    } catch {
      /*
       * An empty body is valid. The production site URL
       * will be used as the return origin.
       */
    }

    let approvedSiteOrigin: string;

    try {
      approvedSiteOrigin =
        normalizeOrigin(siteUrl);
    } catch (error) {
      console.error(
        "BOBU site URL is invalid:",
        error,
      );

      return jsonResponse(
        {
          error:
            "Instagram return configuration is invalid.",
        },
        500,
      );
    }

    let requestedReturnOrigin =
      approvedSiteOrigin;

    if (
      typeof body.return_url === "string" &&
      body.return_url.trim()
    ) {
      try {
        requestedReturnOrigin =
          normalizeOrigin(
            body.return_url.trim(),
          );
      } catch {
        return jsonResponse(
          {
            error:
              "Instagram return URL is invalid.",
          },
          400,
        );
      }
    }

    /*
     * Production callbacks may return only to the configured
     * BOBU site origin. This prevents open redirects.
     */
    if (
      requestedReturnOrigin !==
      approvedSiteOrigin
    ) {
      return jsonResponse(
        {
          error:
            "Instagram return URL is not allowed.",
        },
        403,
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

    /*
     * Invalidate earlier unused Instagram states belonging
     * to this Builder before issuing a new workflow.
     */
    const {
      error: invalidateError,
    } = await adminClient
      .from("instagram_oauth_states")
      .update({
        used_at:
          new Date().toISOString(),
      })
      .eq("builder_id", user.id)
      .is("used_at", null);

    if (invalidateError) {
      console.error(
        "Previous Instagram state invalidation failed:",
        invalidateError.message,
      );

      return jsonResponse(
        {
          error:
            "Instagram connection could not be prepared.",
        },
        500,
      );
    }

    const rawState = generateState();

    const stateHash =
      await sha256(rawState);

    const expiresAt =
      new Date(
        Date.now() + 15 * 60 * 1000,
      ).toISOString();

    const {
      error: insertError,
    } = await adminClient
      .from("instagram_oauth_states")
      .insert({
        builder_id: user.id,
        state_hash: stateHash,
        redirect_origin:
          requestedReturnOrigin,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error(
        "Instagram OAuth state insert failed:",
        insertError.message,
      );

      return jsonResponse(
        {
          error:
            "Instagram connection could not be created.",
        },
        500,
      );
    }

    const authorizationUrl =
      new URL(
        "https://www.instagram.com/oauth/authorize",
      );

    authorizationUrl.searchParams.set(
      "client_id",
      instagramAppId,
    );

    authorizationUrl.searchParams.set(
      "redirect_uri",
      instagramRedirectUri,
    );

    authorizationUrl.searchParams.set(
      "response_type",
      "code",
    );

    authorizationUrl.searchParams.set(
      "scope",
      "instagram_business_basic",
    );

    authorizationUrl.searchParams.set(
      "state",
      rawState,
    );

    return jsonResponse({
      ok: true,
      configured: true,
      authorization_url:
        authorizationUrl.toString(),
      expires_at: expiresAt,
    });
  },
};

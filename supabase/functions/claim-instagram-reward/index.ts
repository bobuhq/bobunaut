import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error(
        "Required Instagram verification environment variables are missing.",
      );

      return jsonResponse(
        {
          error:
            "Instagram verification is not configured.",
        },
        500,
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentication is required." },
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
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      console.error(
        "Instagram reward authentication failed:",
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
      data: identity,
      error: identityError,
    } = await adminClient
      .from("builder_social_identities")
      .select(
        "provider_user_id, username, verified, reward_claimed, reward_claimed_at",
      )
      .eq("builder_id", user.id)
      .eq("provider", "instagram")
      .maybeSingle();

    if (identityError) {
      console.error(
        "Instagram identity lookup failed:",
        identityError.message,
      );

      return jsonResponse(
        {
          error:
            "Instagram identity could not be checked.",
        },
        500,
      );
    }

    if (
      !identity?.provider_user_id ||
      identity.verified !== true
    ) {
      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "Connect and verify your Instagram account first.",
        },
        409,
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await adminClient
      .from("builder_profiles")
      .select("gp")
      .eq("builder_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Builder GP lookup failed:",
        profileError.message,
      );

      return jsonResponse(
        {
          error:
            "Instagram verification completed, but GP could not be loaded.",
        },
        500,
      );
    }

    return jsonResponse({
      verified: true,
      linked: true,
      rewarded: false,
      already_rewarded:
        identity.reward_claimed === true,
      reward_gp: 0,
      total_gp: Number(profile?.gp ?? 0),
      message:
        "Instagram is already verified and rewarded.",
    });
  },
};

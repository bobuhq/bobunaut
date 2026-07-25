import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const INSTAGRAM_REWARD_GP = 5000;

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
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed." },
        405,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Required environment variables are missing.");

      return jsonResponse(
        {
          error: "Instagram reward is not configured.",
        },
        500,
      );
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentication is required." },
        401,
      );
    }

    const accessToken = authorization.slice(7).trim();

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
      return jsonResponse(
        {
          error: "Your session is invalid or has expired.",
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

    const idempotencyKey =
      `social-verification:instagram:${user.id}`;

    const {
      data: rewardResult,
      error: rewardError,
    } = await adminClient.rpc("award_builder_gp", {
      p_builder_id: user.id,
      p_reward_type: "social_verification",
      p_amount: INSTAGRAM_REWARD_GP,
      p_idempotency_key: idempotencyKey,
      p_provider: "instagram",
      p_metadata: {
        method: "community-link-visit",
        profile_url:
          "https://www.instagram.com/bobu_universe",
      },
    });

    if (rewardError) {
      console.error(
        "Instagram reward failed:",
        rewardError.message,
      );

      return jsonResponse(
        {
          verified: false,
          rewarded: false,
          error:
            "Instagram reward could not be processed.",
        },
        500,
      );
    }

    const rewardRow = Array.isArray(rewardResult)
      ? rewardResult[0]
      : rewardResult;

    const newlyAwarded =
      rewardRow?.awarded === true;

    const totalGp =
      typeof rewardRow?.total_gp === "number"
        ? rewardRow.total_gp
        : Number(rewardRow?.total_gp ?? 0);

    const completedAt = new Date().toISOString();

    const { error: identityError } = await adminClient
      .from("builder_social_identities")
      .upsert(
        {
          builder_id: user.id,
          provider: "instagram",
          provider_user_id: user.id,
          username: null,
          verified: true,
          reward_claimed: true,
          reward_claimed_at: completedAt,
          updated_at: completedAt,
        },
        {
          onConflict: "builder_id,provider",
        },
      );

    if (identityError) {
      console.error(
        "Instagram identity update failed:",
        identityError.message,
      );

      return jsonResponse(
        {
          verified: true,
          rewarded: newlyAwarded,
          reward_gp: newlyAwarded
            ? INSTAGRAM_REWARD_GP
            : 0,
          total_gp: totalGp,
          warning:
            "Reward succeeded, but Instagram status could not be updated.",
        },
        500,
      );
    }

    return jsonResponse({
      verified: true,
      linked: true,
      rewarded: newlyAwarded,
      already_rewarded: !newlyAwarded,
      reward_gp: newlyAwarded
        ? INSTAGRAM_REWARD_GP
        : 0,
      total_gp: totalGp,
      message: newlyAwarded
        ? `Instagram completed. ${INSTAGRAM_REWARD_GP} GP awarded.`
        : "Instagram reward was already claimed.",
    });
  },
};

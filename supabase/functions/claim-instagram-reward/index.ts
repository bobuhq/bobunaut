import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const INSTAGRAM_REWARD_GP = 5000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InstagramClaimRow {
  verified: boolean;
  rewarded: boolean;
  already_rewarded: boolean;
  reward_gp: number | string;
  total_gp: number | string;
  ledger_id: string | null;
  completed_at: string | null;
  reason: string;
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

function numberValue(
  value: number | string | null | undefined,
): number {
  const normalized = Number(value ?? 0);

  return Number.isFinite(normalized)
    ? normalized
    : 0;
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
        "Instagram manual verification configuration is incomplete.",
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
    } = await userClient.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      console.error(
        "Instagram manual verification authentication failed:",
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

    /*
     * This clearly identifies the temporary manual redirect
     * verification method. It is not presented as a real
     * Instagram OAuth user ID.
     */
    const manualProviderUserId =
      `manual_redirect:${user.id}`;

    const {
      data: claimResult,
      error: claimError,
    } = await adminClient.rpc(
      "claim_instagram_identity_reward",
      {
        p_builder_id: user.id,
        p_provider_user_id:
          manualProviderUserId,
        p_username: null,
      },
    );

    if (claimError) {
      console.error(
        "Instagram manual reward claim failed:",
        claimError.message,
      );

      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "Instagram verification could not be completed.",
        },
        500,
      );
    }

    const normalizedData =
      Array.isArray(claimResult)
        ? claimResult[0]
        : claimResult;

    if (!normalizedData) {
      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "Instagram verification returned no result.",
        },
        500,
      );
    }

    const row =
      normalizedData as InstagramClaimRow;

    if (row.verified !== true) {
      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "Instagram verification could not be completed.",
        },
        409,
      );
    }

    const rewarded =
      row.rewarded === true;

    const rewardGp =
      numberValue(row.reward_gp);

    return jsonResponse({
      verified: true,
      linked: true,
      rewarded,
      already_rewarded:
        row.already_rewarded === true,
      reward_gp: rewardGp,
      total_gp:
        numberValue(row.total_gp),
      ledger_id:
        row.ledger_id ?? undefined,
      completed_at:
        row.completed_at ?? undefined,
      verification_method:
        "manual_redirect",
      message: rewarded
        ? `Instagram completed. ${INSTAGRAM_REWARD_GP.toLocaleString()} GP awarded.`
        : "Instagram is already completed and rewarded.",
    });
  },
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ClaimXRewardRow {
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

const numberValue = (
  value: number | string | null | undefined,
): number => {
  const normalized = Number(value ?? 0);

  return Number.isFinite(normalized)
    ? normalized
    : 0;
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error(
        "Required X verification environment variables are missing.",
      );

      return jsonResponse(
        { error: "X verification is not configured." },
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
        "X reward authentication failed:",
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

    /*
     * X identity propagation can lag briefly after an OAuth
     * callback. Do not trust the first client-session snapshot.
     *
     * Read the authoritative Auth user with service role and
     * retry for a short bounded window. This makes web and
     * native verification deterministic instead of timing-sensitive.
     */
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

    let authoritativeUser = user;
    let xIdentity =
      authoritativeUser.identities?.find(
        (identity) =>
          identity.provider.toLowerCase() === "x",
      );

    for (
      let attempt = 0;
      !xIdentity && attempt < 6;
      attempt += 1
    ) {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500),
        );
      }

      const {
        data: adminUserData,
        error: adminUserError,
      } = await adminClient.auth.admin.getUserById(
        user.id,
      );

      if (adminUserError) {
        console.error(
          "Authoritative X identity lookup failed:",
          adminUserError.message,
        );
        break;
      }

      if (adminUserData.user) {
        authoritativeUser =
          adminUserData.user;

        xIdentity =
          authoritativeUser.identities?.find(
            (identity) =>
              identity.provider.toLowerCase() === "x",
          );
      }
    }

    if (!xIdentity) {
      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          status: "x_identity_pending",
          error:
            "X connection is still being finalized. Please retry.",
        },
        409,
      );
    }

    const providerUserId =
      xIdentity.identity_data?.sub ??
      xIdentity.id;

    if (
      typeof providerUserId !== "string" ||
      providerUserId.trim().length === 0
    ) {
      console.error(
        "Trusted X identity did not include a provider user ID.",
      );

      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "Your X identity could not be verified.",
        },
        422,
      );
    }

    const usernameCandidate =
      xIdentity.identity_data?.user_name ??
      xIdentity.identity_data?.preferred_username ??
      xIdentity.identity_data?.username ??
      null;

    const username =
      typeof usernameCandidate === "string"
        ? usernameCandidate
        : null;

    const {
      data: claimResult,
      error: claimError,
    } = await adminClient.rpc(
      "claim_x_identity_reward",
      {
        p_builder_id: user.id,
        p_provider_user_id:
          providerUserId.trim(),
        p_username: username,
      },
    );

    if (claimError) {
      console.error(
        "Atomic X verification failed:",
        claimError.message,
      );

      return jsonResponse(
        {
          verified: false,
          linked: true,
          rewarded: false,
          error:
            "X verification could not be completed.",
        },
        500,
      );
    }

    const normalizedData =
      Array.isArray(claimResult)
        ? claimResult[0]
        : claimResult;

    if (!normalizedData) {
      console.error(
        "Atomic X verification returned no data.",
      );

      return jsonResponse(
        {
          verified: false,
          linked: true,
          rewarded: false,
          error:
            "X verification returned no result.",
        },
        500,
      );
    }

    const row =
      normalizedData as ClaimXRewardRow;

    if (
      row.reason === "identity_already_linked"
    ) {
      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "This X account is already connected to another Builder account.",
        },
        409,
      );
    }

    if (row.verified !== true) {
      console.error(
        "Atomic X verification was rejected:",
        row.reason,
      );

      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "X verification could not be completed.",
        },
        409,
      );
    }

    const rewarded =
      row.rewarded === true;

    const rewardGp =
      numberValue(row.reward_gp);

    const totalGp =
      numberValue(row.total_gp);

    return jsonResponse({
      verified: true,
      linked: true,
      rewarded,
      already_rewarded:
        row.already_rewarded === true,
      reward_gp: rewardGp,
      total_gp: totalGp,
      ledger_id:
        row.ledger_id ?? undefined,
      completed_at:
        row.completed_at ?? undefined,
      message: rewarded
        ? `X verified. ${rewardGp.toLocaleString()} GP awarded.`
        : "X is already verified and rewarded.",
    });
  },
};

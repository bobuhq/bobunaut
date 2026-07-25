import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TELEGRAM_REWARD_GP = 250;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TelegramMemberResponse = {
  ok: boolean;
  result?: {
    status?: string;
    is_member?: boolean;
  };
  description?: string;
};

const acceptedMemberStatuses = new Set([
  "creator",
  "administrator",
  "member",
  "restricted",
]);

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
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !botToken ||
      !chatId
    ) {
      console.error("Required environment variables are missing.");

      return jsonResponse(
        {
          error: "Telegram verification is not configured.",
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
      console.error(
        "Authentication failed:",
        userError?.message ?? "No user.",
      );

      return jsonResponse(
        { error: "Your session is invalid or has expired." },
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
        "builder_id, provider_user_id, username, verified, reward_claimed",
      )
      .eq("builder_id", user.id)
      .eq("provider", "telegram")
      .maybeSingle();

    if (identityError) {
      console.error(
        "Telegram identity lookup failed:",
        identityError.message,
      );

      return jsonResponse(
        {
          error: "Telegram identity could not be checked.",
        },
        500,
      );
    }

    if (!identity?.provider_user_id) {
      return jsonResponse(
        {
          verified: false,
          linked: false,
          rewarded: false,
          error:
            "Connect your Telegram account through the BOBU verification bot first.",
        },
        409,
      );
    }

    const telegramUrl = new URL(
      `https://api.telegram.org/bot${botToken}/getChatMember`,
    );

    telegramUrl.searchParams.set("chat_id", chatId);
    telegramUrl.searchParams.set(
      "user_id",
      String(identity.provider_user_id),
    );

    let telegramData: TelegramMemberResponse;

    try {
      const telegramResponse = await fetch(telegramUrl);
      telegramData =
        await telegramResponse.json() as TelegramMemberResponse;

      if (!telegramResponse.ok || !telegramData.ok) {
        console.error(
          "Telegram API error:",
          telegramData.description ??
            telegramResponse.statusText,
        );

        return jsonResponse(
          {
            verified: false,
            linked: true,
            rewarded: false,
            error: "Telegram membership could not be verified.",
          },
          502,
        );
      }
    } catch (error) {
      console.error(
        "Telegram verification request failed:",
        error,
      );

      return jsonResponse(
        {
          verified: false,
          linked: true,
          rewarded: false,
          error:
            "Telegram verification service is temporarily unavailable.",
        },
        503,
      );
    }

    const membershipStatus =
      telegramData.result?.status ?? "unknown";

    const isRestrictedMember =
      membershipStatus === "restricted" &&
      telegramData.result?.is_member !== false;

    const verified =
      acceptedMemberStatuses.has(membershipStatus) &&
      (
        membershipStatus !== "restricted" ||
        isRestrictedMember
      );

    if (!verified) {
      return jsonResponse({
        verified: false,
        linked: true,
        rewarded: false,
        status: membershipStatus,
        message:
          "Join the BOBU Telegram community, then try verification again.",
      });
    }

    /*
     * Stable key:
     * the same Builder can receive the Telegram reward only once.
     */
    const idempotencyKey =
      `social-verification:telegram:${user.id}`;

    const {
      data: rewardResult,
      error: rewardError,
    } = await adminClient.rpc("award_builder_gp", {
      p_builder_id: user.id,
      p_reward_type: "social_verification",
      p_amount: TELEGRAM_REWARD_GP,
      p_idempotency_key: idempotencyKey,
      p_provider: "telegram",
      p_metadata: {
        telegram_user_id: String(identity.provider_user_id),
        telegram_username: identity.username ?? null,
        membership_status: membershipStatus,
      },
    });

    if (rewardError) {
      console.error(
        "Telegram reward failed:",
        rewardError.message,
      );

      return jsonResponse(
        {
          verified: true,
          linked: true,
          rewarded: false,
          status: membershipStatus,
          error:
            "Telegram was verified, but the GP reward could not be processed.",
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

    const verifiedAt = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from("builder_social_identities")
      .update({
        verified: true,
        reward_claimed: true,
        reward_claimed_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("builder_id", user.id)
      .eq("provider", "telegram");

    if (updateError) {
      /*
       * The ledger idempotency key still prevents duplicate GP
       * if the Builder retries after this error.
       */
      console.error(
        "Telegram identity status update failed:",
        updateError.message,
      );

      return jsonResponse(
        {
          verified: true,
          linked: true,
          rewarded: newlyAwarded,
          reward_gp: newlyAwarded
            ? TELEGRAM_REWARD_GP
            : 0,
          total_gp: totalGp,
          status: membershipStatus,
          warning:
            "Verification succeeded, but the identity status could not be updated.",
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
        ? TELEGRAM_REWARD_GP
        : 0,
      total_gp: totalGp,
      status: membershipStatus,
      message: newlyAwarded
        ? `Telegram verified. ${TELEGRAM_REWARD_GP} GP awarded.`
        : "Telegram is already verified and rewarded.",
    });
  },
};

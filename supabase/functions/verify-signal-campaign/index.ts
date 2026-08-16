import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type SecurityAlertSeverity =
  | "warning"
  | "critical";

type SecurityAlertInput = {
  eventType: string;
  severity: SecurityAlertSeverity;
  action: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
};

function getRequestClientIp(
  req: Request,
): string | null {
  const forwardedFor =
    req.headers.get("x-forwarded-for");

  return (
    req.headers.get("cf-connecting-ip")
      ?.trim() ||
    forwardedFor
      ?.split(",")[0]
      ?.trim() ||
    null
  );
}

async function emitSecurityAlert(
  req: Request,
  input: SecurityAlertInput,
): Promise<void> {
  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const alertSecret =
      Deno.env.get(
        "BOBU_SECURITY_ALERT_SECRET",
      );

    if (!supabaseUrl || !alertSecret) {
      console.warn(
        "Security alert integration is not configured.",
      );
      return;
    }

    const originalClientIp =
      getRequestClientIp(req);

    const response = await fetch(
      `${supabaseUrl}/functions/v1/security-alert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BOBU-Security-Secret":
            alertSecret,
        },
        body: JSON.stringify({
          eventType: input.eventType,
          severity: input.severity,
          source:
            "verify-signal-campaign",
          actorUserId:
            input.actorUserId ?? null,
          sourceIp: originalClientIp,
          action: input.action,
          metadata: {
            ...(input.metadata ?? {}),
            originalClientIp,
          },
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Security alert emission failed:",
        response.status,
        await response.text(),
      );
    }
  } catch (alertError) {
    /*
     * Security telemetry must never break
     * the Signal mission itself.
     */
    console.error(
      "Security alert emission exception:",
      alertError,
    );
  }
}


type XUser = {
  id?: string;
  username?: string;
  protected?: boolean;
};

type XPost = {
  id?: string;
  author_id?: string;
  referenced_tweets?: Array<{
    type?: string;
    id?: string;
  }>;
};

type XApiResponse<T> = {
  data?: T[];
  meta?: {
    next_token?: string;
    pagination_token?: string;
    result_count?: number;
  };
  errors?: unknown[];
  title?: string;
  detail?: string;
};

async function xGet<T>(
  url: URL,
  bearerToken: string,
): Promise<XApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
  });

  const payload =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(
      "X API request failed:",
      response.status,
      payload,
    );

    throw new Error(
      `X_API_${response.status}`,
    );
  }

  return payload as XApiResponse<T>;
}

async function verifyRecentSearchActivity(
  bearerToken: string,
  query: string,
  expectedUserId: string,
  expectedTargetPostId: string,
  expectedReferenceType:
    | "retweeted"
    | "replied_to",
): Promise<boolean> {
  let nextToken: string | undefined;
  let pageCount = 0;

  do {
    const url = new URL(
      "https://api.x.com/2/tweets/search/recent",
    );

    url.searchParams.set("query", query);
    url.searchParams.set(
      "tweet.fields",
      [
        "author_id",
        "referenced_tweets",
        "created_at",
      ].join(","),
    );
    url.searchParams.set(
      "max_results",
      "100",
    );

    if (nextToken) {
      url.searchParams.set(
        "next_token",
        nextToken,
      );
    }

    const payload =
      await xGet<XPost>(
        url,
        bearerToken,
      );

    for (const post of payload.data ?? []) {
      if (
        post.author_id !== expectedUserId
      ) {
        continue;
      }

      const hasExpectedReference =
        post.referenced_tweets?.some(
          (reference) =>
            reference.type ===
              expectedReferenceType &&
            reference.id ===
              expectedTargetPostId,
        ) ?? false;

      if (hasExpectedReference) {
        return true;
      }
    }

    nextToken =
      payload.meta?.next_token;

    pageCount += 1;

    /*
     * User-specific search queries should normally
     * return very few results. Limit pagination to
     * protect X API quota.
     */
  } while (
    nextToken &&
    pageCount < 3
  );

  return false;
}

async function verifyRepost(
  bearerToken: string,
  postId: string,
  expectedUserId: string,
  username: string,
): Promise<{
  verified: boolean;
  source:
    | "retweeted_by"
    | "recent_search"
    | "not_found";
}> {
  const lookupUrl = new URL(
    `https://api.x.com/2/tweets/${postId}/retweeted_by`,
  );

  lookupUrl.searchParams.set(
    "max_results",
    "100",
  );

  try {
    const lookup =
      await xGet<XUser>(
        lookupUrl,
        bearerToken,
      );

    const directMatch =
      (lookup.data ?? []).some(
        (user) =>
          user.id === expectedUserId,
      );

    if (directMatch) {
      return {
        verified: true,
        source: "retweeted_by",
      };
    }
  } catch (error) {
    /*
     * Do not fail the entire mission merely because
     * the direct repost lookup is unavailable for the
     * current X API access tier. Continue with the
     * user-specific recent-search fallback.
     */
    console.warn(
      "retweeted_by lookup unavailable; using recent search fallback:",
      error,
    );
  }

  const normalizedUsername =
    username.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    return {
      verified: false,
      source: "not_found",
    };
  }

  const searchVerified =
    await verifyRecentSearchActivity(
      bearerToken,
      `retweets_of_tweet_id:${postId} from:${normalizedUsername}`,
      expectedUserId,
      postId,
      "retweeted",
    );

  return {
    verified: searchVerified,
    source: searchVerified
      ? "recent_search"
      : "not_found",
  };
}

async function verifyReply(
  bearerToken: string,
  postId: string,
  expectedUserId: string,
  username: string,
): Promise<boolean> {
  const normalizedUsername =
    username.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    return false;
  }

  return await verifyRecentSearchActivity(
    bearerToken,
    `in_reply_to_tweet_id:${postId} from:${normalizedUsername}`,
    expectedUserId,
    postId,
    "replied_to",
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
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

    const xBearerToken =
      Deno.env.get("X_API_BEARER_TOKEN");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          error:
            "Server configuration is incomplete.",
        },
        500,
      );
    }

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      await emitSecurityAlert(
        req,
        {
          eventType:
            "signal_auth_missing",
          severity: "warning",
          action:
            "request_rejected",
          metadata: {
            reason:
              "missing_or_invalid_bearer_header",
          },
        },
      );

      return jsonResponse(
        {
          error: "Unauthorized",
        },
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
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      await emitSecurityAlert(
        req,
        {
          eventType:
            "signal_auth_invalid",
          severity: "warning",
          action:
            "request_rejected",
          metadata: {
            reason:
              "supabase_user_validation_failed",
          },
        },
      );

      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const body = await req.json().catch(
      () => ({}),
    );

    const campaignId =
      typeof body?.campaign_id === "string"
        ? body.campaign_id
        : "";

    if (!campaignId) {
      return jsonResponse(
        {
          error: "campaign_id is required.",
        },
        400,
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const {
      data: campaign,
      error: campaignError,
    } = await adminClient
      .from("bobu_signal_campaigns")
      .select(
        [
          "id",
          "slug",
          "title",
          "post_url",
          "post_id",
          "reward_gp",
          "require_repost",
          "require_reply",
          "starts_at",
          "ends_at",
          "status",
        ].join(","),
      )
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) {
      console.error(
        "Signal campaign lookup failed:",
        campaignError,
      );

      return jsonResponse(
        {
          error:
            "Unable to load signal campaign.",
        },
        500,
      );
    }

    if (!campaign) {
      return jsonResponse(
        {
          error: "Campaign not found.",
        },
        404,
      );
    }

    const now = new Date();

    if (campaign.status !== "active") {
      return jsonResponse(
        {
          error: "Campaign is not active.",
        },
        409,
      );
    }

    if (
      campaign.starts_at &&
      new Date(campaign.starts_at) > now
    ) {
      return jsonResponse(
        {
          error:
            "Campaign has not started yet.",
        },
        409,
      );
    }

    if (
      campaign.ends_at &&
      new Date(campaign.ends_at) <= now
    ) {
      return jsonResponse(
        {
          error: "Campaign has ended.",
        },
        409,
      );
    }

    const {
      data: identity,
      error: identityError,
    } = await adminClient
      .from("builder_social_identities")
      .select(
        [
          "provider",
          "provider_user_id",
          "username",
          "verified",
          "verified_at",
        ].join(","),
      )
      .eq("builder_id", user.id)
      .eq("provider", "x")
      .eq("verified", true)
      .maybeSingle();

    if (identityError) {
      console.error(
        "X identity lookup failed:",
        identityError,
      );

      return jsonResponse(
        {
          error:
            "Unable to load verified X identity.",
        },
        500,
      );
    }

    if (
      !identity?.provider_user_id
    ) {
      return jsonResponse(
        {
          error:
            "A verified X identity is required.",
          code: "X_IDENTITY_REQUIRED",
        },
        409,
      );
    }

    const {
      data: existingClaim,
      error: claimLookupError,
    } = await adminClient
      .from("bobu_signal_campaign_claims")
      .select(
        [
          "verification_status",
          "reward_awarded",
        ].join(","),
      )
      .eq("campaign_id", campaign.id)
      .eq("builder_id", user.id)
      .maybeSingle();

    if (claimLookupError) {
      console.error(
        "Signal claim lookup failed:",
        claimLookupError,
      );

      return jsonResponse(
        {
          error:
            "Unable to load campaign status.",
        },
        500,
      );
    }

    if (existingClaim?.reward_awarded) {
      return jsonResponse({
        accepted: true,
        alreadyClaimed: true,
        campaignId: campaign.id,
        verificationStatus:
          existingClaim.verification_status,
        rewardAwarded: true,
      });
    }

    if (!xBearerToken) {
      return jsonResponse(
        {
          error:
            "X verification service is not configured.",
          code:
            "X_API_NOT_CONFIGURED",
        },
        503,
      );
    }

    const providerUserId =
      identity.provider_user_id.trim();

    const username =
      (identity.username ?? "")
        .trim()
        .replace(/^@/, "");

    if (!username) {
      return jsonResponse(
        {
          error:
            "Your X identity must be reconnected before this mission can be verified.",
          code:
            "X_USERNAME_REQUIRED",
        },
        409,
      );
    }

    let repostVerified =
      !campaign.require_repost;

    let repostSource:
      | "not_required"
      | "retweeted_by"
      | "recent_search"
      | "not_found" =
        campaign.require_repost
          ? "not_found"
          : "not_required";

    if (campaign.require_repost) {
      const repostResult =
        await verifyRepost(
          xBearerToken,
          campaign.post_id,
          providerUserId,
          username,
        );

      repostVerified =
        repostResult.verified;

      repostSource =
        repostResult.source;
    }

    let replyVerified =
      !campaign.require_reply;

    if (campaign.require_reply) {
      replyVerified =
        await verifyReply(
          xBearerToken,
          campaign.post_id,
          providerUserId,
          username,
        );
    }

    if (
      !repostVerified ||
      !replyVerified
    ) {
      return jsonResponse({
        accepted: true,
        campaignId: campaign.id,
        verificationStatus:
          "pending",
        repostVerified,
        replyVerified,
        repostSource,
        rewardAwarded: false,
      });
    }

    const verificationMetadata = {
      verifier: "x_api_v2",
      verified_at:
        new Date().toISOString(),
      repost_source:
        repostSource,
      require_repost:
        campaign.require_repost,
      require_reply:
        campaign.require_reply,
    };

    const {
      data: rewardResult,
      error: rewardError,
    } = await adminClient.rpc(
      "finalize_signal_campaign_reward",
      {
        p_campaign_id:
          campaign.id,
        p_builder_id:
          user.id,
        p_x_provider_user_id:
          providerUserId,
        p_x_username:
          username,
        p_repost_verified:
          repostVerified,
        p_reply_verified:
          replyVerified,
        p_verification_metadata:
          verificationMetadata,
      },
    );

    if (rewardError) {
      console.error(
        "Signal reward finalization failed:",
        rewardError,
      );

      await emitSecurityAlert(
        req,
        {
          eventType:
            "signal_reward_finalization_failed",
          severity: "critical",
          action:
            "reward_blocked",
          actorUserId: user.id,
          metadata: {
            campaignId:
              campaign.id,
            providerUserId,
            repostVerified,
            replyVerified,
            errorCode:
              rewardError.code ?? null,
          },
        },
      );

      return jsonResponse(
        {
          error:
            "Signal mission reward could not be finalized.",
        },
        500,
      );
    }

    const result =
      Array.isArray(rewardResult)
        ? rewardResult[0]
        : rewardResult;

    return jsonResponse({
      accepted: true,
      campaignId:
        campaign.id,
      verificationStatus:
        "verified",
      repostVerified,
      replyVerified,
      repostSource,
      rewardAwarded:
        Boolean(result?.awarded),
      alreadyAwarded:
        Boolean(
          result?.already_awarded,
        ),
      rewardGp:
        Number(
          result?.reward_gp ?? 0,
        ),
    });
  } catch (error) {
    console.error(
      "verify-signal-campaign failed:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const xApiMatch =
      /^X_API_(\d{3})$/.exec(message);

    if (xApiMatch) {
      const status =
        Number(xApiMatch[1]);

      const shouldAlert =
        status === 401 ||
        status === 403 ||
        status === 429 ||
        status >= 500;

      if (shouldAlert) {
        await emitSecurityAlert(
          req,
          {
            eventType:
              `signal_x_api_${status}`,
            severity: "warning",
            action:
              "external_verification_failed",
            metadata: {
              xStatus: status,
            },
          },
        );
      }
    } else {
      await emitSecurityAlert(
        req,
        {
          eventType:
            "signal_unexpected_server_error",
          severity: "critical",
          action:
            "request_failed",
          metadata: {
            errorType:
              error instanceof Error
                ? error.name
                : typeof error,
          },
        },
      );
    }

    return jsonResponse(
      {
        error:
          "Signal verification failed.",
      },
      500,
    );
  }
});

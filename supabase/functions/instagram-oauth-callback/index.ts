import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface InstagramTokenResponse {
  access_token?: string;
  user_id?: number | string;
  error_type?: string;
  code?: number;
  error_message?: string;
}

interface InstagramProfileResponse {
  id?: string;
  user_id?: string;
  username?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
}

interface ConsumedStateRow {
  consumed: boolean;
  builder_id: string | null;
  redirect_origin: string | null;
  reason: string;
}

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

const sha256 = async (
  value: string,
): Promise<string> => {
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
};

const redirectResponse = (
  origin: string,
  params: Record<string, string>,
): Response => {
  const url = new URL("/identity", origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return Response.redirect(
    url.toString(),
    302,
  );
};

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
    if (req.method !== "GET") {
      return Response.json(
        { error: "Method not allowed." },
        { status: 405 },
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const instagramAppId =
      Deno.env.get("INSTAGRAM_APP_ID");

    const instagramAppSecret =
      Deno.env.get(
        "INSTAGRAM_APP_SECRET",
      );

    const instagramRedirectUri =
      Deno.env.get(
        "INSTAGRAM_REDIRECT_URI",
      );

    const defaultSiteOrigin =
      Deno.env.get("BOBU_SITE_URL") ??
      "https://bobunaut.com";

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !instagramAppId ||
      !instagramAppSecret ||
      !instagramRedirectUri
    ) {
      console.error(
        "Instagram OAuth callback configuration is incomplete.",
      );

      return redirectResponse(
        defaultSiteOrigin,
        {
          instagram: "error",
          reason: "not_configured",
        },
      );
    }

    const requestUrl =
      new URL(req.url);

    const code =
      requestUrl.searchParams
        .get("code")
        ?.trim();

    const state =
      requestUrl.searchParams
        .get("state")
        ?.trim();

    const oauthError =
      requestUrl.searchParams.get("error");

    const oauthErrorReason =
      requestUrl.searchParams.get(
        "error_reason",
      );

    if (oauthError) {
      return redirectResponse(
        defaultSiteOrigin,
        {
          instagram: "error",
          reason:
            oauthErrorReason ??
            oauthError,
        },
      );
    }

    if (!code || !state) {
      return redirectResponse(
        defaultSiteOrigin,
        {
          instagram: "error",
          reason:
            "missing_oauth_parameters",
        },
      );
    }

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

    /*
     * Exchange the one-time authorization code for an
     * Instagram access token. Secrets never reach the browser.
     */
    const tokenBody =
      new URLSearchParams({
        client_id: instagramAppId,
        client_secret:
          instagramAppSecret,
        grant_type:
          "authorization_code",
        redirect_uri:
          instagramRedirectUri,
        code,
      });

    let tokenData: InstagramTokenResponse;

    try {
      const tokenResponse =
        await fetch(
          "https://api.instagram.com/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },
            body: tokenBody,
          },
        );

      tokenData =
        await tokenResponse.json() as
          InstagramTokenResponse;

      if (
        !tokenResponse.ok ||
        !tokenData.access_token
      ) {
        console.error(
          "Instagram token exchange failed:",
          tokenData,
        );

        return redirectResponse(
          defaultSiteOrigin,
          {
            instagram: "error",
            reason:
              "token_exchange_failed",
          },
        );
      }
    } catch (error) {
      console.error(
        "Instagram token exchange request failed:",
        error,
      );

      return redirectResponse(
        defaultSiteOrigin,
        {
          instagram: "error",
          reason:
            "instagram_unavailable",
        },
      );
    }

    /*
     * Validate and consume the state atomically after the
     * Instagram authorization code has been accepted.
     */
    const stateHash =
      await sha256(state);

    const {
      data: stateResult,
      error: stateError,
    } = await adminClient.rpc(
      "consume_instagram_oauth_state",
      {
        p_state_hash: stateHash,
      },
    );

    if (stateError) {
      console.error(
        "Instagram OAuth state consumption failed:",
        stateError.message,
      );

      return redirectResponse(
        defaultSiteOrigin,
        {
          instagram: "error",
          reason:
            "state_validation_failed",
        },
      );
    }

    const stateRow =
      (
        Array.isArray(stateResult)
          ? stateResult[0]
          : stateResult
      ) as ConsumedStateRow | null;

    const returnOrigin =
      stateRow?.redirect_origin ??
      defaultSiteOrigin;

    if (
      !stateRow?.consumed ||
      !stateRow.builder_id
    ) {
      return redirectResponse(
        returnOrigin,
        {
          instagram: "error",
          reason:
            stateRow?.reason ??
            "invalid_state",
        },
      );
    }

    /*
     * Load the authenticated Instagram professional account.
     */
    const profileUrl =
      new URL(
        "https://graph.instagram.com/me",
      );

    profileUrl.searchParams.set(
      "fields",
      "id,user_id,username",
    );

    profileUrl.searchParams.set(
      "access_token",
      tokenData.access_token,
    );

    let profileData:
      InstagramProfileResponse;

    try {
      const profileResponse =
        await fetch(profileUrl);

      profileData =
        await profileResponse.json() as
          InstagramProfileResponse;

      if (
        !profileResponse.ok ||
        profileData.error
      ) {
        console.error(
          "Instagram profile request failed:",
          profileData.error ??
            profileData,
        );

        return redirectResponse(
          returnOrigin,
          {
            instagram: "error",
            reason:
              "profile_lookup_failed",
          },
        );
      }
    } catch (error) {
      console.error(
        "Instagram profile request failed:",
        error,
      );

      return redirectResponse(
        returnOrigin,
        {
          instagram: "error",
          reason:
            "instagram_unavailable",
        },
      );
    }

    const providerUserId =
      String(
        profileData.user_id ??
        profileData.id ??
        tokenData.user_id ??
        "",
      ).trim();

    if (!providerUserId) {
      console.error(
        "Instagram profile did not include a user ID.",
      );

      return redirectResponse(
        returnOrigin,
        {
          instagram: "error",
          reason:
            "missing_instagram_identity",
        },
      );
    }

    const username =
      typeof profileData.username ===
        "string"
        ? profileData.username
        : null;

    const {
      data: claimResult,
      error: claimError,
    } = await adminClient.rpc(
      "claim_instagram_identity_reward",
      {
        p_builder_id:
          stateRow.builder_id,
        p_provider_user_id:
          providerUserId,
        p_username: username,
      },
    );

    if (claimError) {
      console.error(
        "Atomic Instagram verification failed:",
        claimError.message,
      );

      return redirectResponse(
        returnOrigin,
        {
          instagram: "error",
          reason:
            "reward_processing_failed",
        },
      );
    }

    const claimRow =
      (
        Array.isArray(claimResult)
          ? claimResult[0]
          : claimResult
      ) as InstagramClaimRow | null;

    if (
      claimRow?.reason ===
      "identity_already_linked"
    ) {
      return redirectResponse(
        returnOrigin,
        {
          instagram: "error",
          reason:
            "identity_already_linked",
        },
      );
    }

    if (!claimRow?.verified) {
      return redirectResponse(
        returnOrigin,
        {
          instagram: "error",
          reason:
            claimRow?.reason ??
            "verification_failed",
        },
      );
    }

    return redirectResponse(
      returnOrigin,
      {
        instagram: "success",
        rewarded:
          claimRow.rewarded
            ? "true"
            : "false",
        reward_gp:
          String(
            numberValue(
              claimRow.reward_gp,
            ),
          ),
        total_gp:
          String(
            numberValue(
              claimRow.total_gp,
            ),
          ),
      },
    );
  },
};

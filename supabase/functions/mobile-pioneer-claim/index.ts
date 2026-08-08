import { createClient } from "@supabase/supabase-js";

import {
  verifyAppleAssertion,
  verifyAppleAttestation,
} from "./apple-app-attest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClaimBody = {
  challengeId?: string;
  platform?: "ios" | "android";
  mode?: "attestation" | "assertion";
  keyId?: string;
  proof?: string;
};

type ChallengeRow = {
  id: string;
  builder_id: string;
  challenge: string;
  platform: string;
  purpose: string;
  expires_at: string;
  consumed_at: string | null;
};

type RewardRow = {
  awarded: boolean;
  reward_gp: number;
  total_gp: number;
  ledger_id: string | null;
};

type AttestedKeyRow = {
  builder_id: string;
  platform: string;
  key_id: string;
  public_key_pem: string | null;
  environment: string;
  assertion_counter: number;
  revoked_at: string | null;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
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
      { error: "Method not allowed" },
      405,
    );
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    return jsonResponse(
      { error: "Server configuration error" },
      500,
    );
  }

  const authorization =
    req.headers.get("Authorization");

  if (
    !authorization?.startsWith("Bearer ")
  ) {
    return jsonResponse(
      { error: "Authentication required" },
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
    },
  );

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(
    accessToken,
  );

  if (authError || !user) {
    return jsonResponse(
      { error: "Invalid session" },
      401,
    );
  }

  let body: ClaimBody;

  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body" },
      400,
    );
  }

  if (
    !body.challengeId ||
    !body.platform ||
    !body.mode ||
    !body.keyId ||
    !body.proof
  ) {
    return jsonResponse(
      { error: "Incomplete attestation payload" },
      400,
    );
  }

  if (body.platform !== "ios") {
    return jsonResponse(
      {
        verified: false,
        awarded: false,
        rewardGp: 0,
        reason:
          "Android Play Integrity verification is not enabled yet",
      },
      403,
    );
  }

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
  );

  const {
    data: challenge,
    error: challengeError,
  } = await adminClient
    .from("mobile_attestation_challenges")
    .select(
      "id,builder_id,challenge,platform,purpose,expires_at,consumed_at",
    )
    .eq("id", body.challengeId)
    .maybeSingle<ChallengeRow>();

  if (
    challengeError ||
    !challenge
  ) {
    return jsonResponse(
      { error: "Attestation challenge not found" },
      400,
    );
  }

  if (
    challenge.builder_id !== user.id ||
    challenge.platform !== "ios" ||
    challenge.purpose !== "mobile_pioneer" ||
    challenge.consumed_at !== null ||
    new Date(challenge.expires_at).getTime()
      <= Date.now()
  ) {
    return jsonResponse(
      { error: "Invalid or expired attestation challenge" },
      400,
    );
  }

  if (body.mode === "assertion") {
    const {
      data: attestedKey,
      error: attestedKeyError,
    } = await adminClient
      .from("mobile_attested_keys")
      .select(
        "builder_id,platform,key_id,public_key_pem,environment,assertion_counter,revoked_at",
      )
      .eq("builder_id", user.id)
      .eq("platform", "ios")
      .eq("key_id", body.keyId)
      .maybeSingle<AttestedKeyRow>();

    if (
      attestedKeyError ||
      !attestedKey ||
      !attestedKey.public_key_pem ||
      attestedKey.revoked_at !== null ||
      attestedKey.environment !== "production"
    ) {
      return jsonResponse(
        {
          verified: false,
          awarded: false,
          rewardGp: 0,
          reason:
            "Verified production App Attest key not found",
        },
        403,
      );
    }

    let assertion;

    try {
      assertion =
        await verifyAppleAssertion(
          body.proof,
          attestedKey.public_key_pem,
          challenge.challenge,
        );
    } catch (error) {
      console.error(
        "[mobile-pioneer-claim] App Attest assertion verification failed:",
        error,
      );

      return jsonResponse(
        {
          verified: false,
          awarded: false,
          rewardGp: 0,
          reason:
            "Apple App Attest assertion verification failed",
        },
        403,
      );
    }

    const {
      data: assertionCommitted,
      error: assertionCommitError,
    } = await adminClient.rpc(
      "commit_verified_mobile_assertion",
      {
        p_builder_id: user.id,
        p_platform: "ios",
        p_key_id: body.keyId,
        p_counter: assertion.counter,
        p_challenge_id: challenge.id,
      },
    );

    if (
      assertionCommitError ||
      assertionCommitted !== true
    ) {
      console.error(
        "[mobile-pioneer-claim] Atomic assertion commit failed:",
        assertionCommitError,
      );

      return jsonResponse(
        {
          verified: false,
          awarded: false,
          rewardGp: 0,
          reason:
            "App Attest assertion replay, rollback, or invalid challenge detected",
        },
        409,
      );
    }

    const {
      data: assertionRewardData,
      error: assertionRewardError,
    } = await adminClient.rpc(
      "claim_verified_mobile_pioneer_reward",
      {
        p_builder_id: user.id,
        p_platform: "ios",
        p_key_id: body.keyId,
      },
    );

    if (assertionRewardError) {
      return jsonResponse(
        {
          error:
            "Mobile Pioneer reward lookup failed",
        },
        500,
      );
    }

    const assertionRewardRow =
      Array.isArray(assertionRewardData)
        ? (
            assertionRewardData[0] as
              RewardRow | undefined
          )
        : (
            assertionRewardData as
              RewardRow | null
          );

    return jsonResponse({
      verified: true,
      keyVerified: true,
      awarded:
        Boolean(
          assertionRewardRow?.awarded,
        ),
      rewardGp:
        Number(
          assertionRewardRow?.reward_gp ?? 0,
        ),
      totalGp:
        Number(
          assertionRewardRow?.total_gp ?? 0,
        ),
      ledgerId:
        assertionRewardRow?.ledger_id ?? null,
    });
  }

  let verified;

  try {
    verified =
      await verifyAppleAttestation(
        body.proof,
        body.keyId,
        challenge.challenge,
      );
  } catch (error) {
    console.error(
      "[mobile-pioneer-claim] App Attest verification failed:",
      error,
    );

    return jsonResponse(
      {
        verified: false,
        awarded: false,
        rewardGp: 0,
        reason:
          "Apple App Attest verification failed",
      },
      403,
    );
  }

  /*
   * Mobile Pioneer is production-only.
   */
  if (
    verified.environment !== "production"
  ) {
    return jsonResponse(
      {
        verified: false,
        awarded: false,
        rewardGp: 0,
        reason:
          "Development App Attest keys are not eligible",
      },
      403,
    );
  }

  const {
    error: keyError,
  } = await adminClient.rpc(
    "register_verified_mobile_attested_key",
    {
      p_builder_id: user.id,
      p_platform: "ios",
      p_key_id: body.keyId,
      p_public_key_pem:
        verified.publicKeyPem,
      p_receipt:
        verified.receiptBase64,
      p_environment:
        verified.environment,
      p_metadata: {
        source:
          "mobile-pioneer-claim",
        verifier_version: 1,
      },
    },
  );

  if (keyError) {
    console.error(
      "[mobile-pioneer-claim] Key registration failed:",
      keyError,
    );

    return jsonResponse(
      { error: "Attested key registration failed" },
      500,
    );
  }

  const {
    data: consumed,
    error: consumeError,
  } = await adminClient.rpc(
    "consume_mobile_attestation_challenge",
    {
      p_challenge_id:
        challenge.id,
      p_builder_id:
        user.id,
      p_platform:
        "ios",
    },
  );

  if (
    consumeError ||
    consumed !== true
  ) {
    return jsonResponse(
      { error: "Attestation challenge could not be consumed" },
      409,
    );
  }

  const {
    data: rewardData,
    error: rewardError,
  } = await adminClient.rpc(
    "claim_verified_mobile_pioneer_reward",
    {
      p_builder_id: user.id,
      p_platform: "ios",
      p_key_id: body.keyId,
    },
  );

  if (rewardError) {
    console.error(
      "[mobile-pioneer-claim] Reward claim failed:",
      rewardError,
    );

    return jsonResponse(
      { error: "Mobile Pioneer reward failed" },
      500,
    );
  }

  const rewardRow =
    Array.isArray(rewardData)
      ? (
          rewardData[0] as
            RewardRow | undefined
        )
      : (
          rewardData as
            RewardRow | null
        );

  if (!rewardRow) {
    return jsonResponse(
      { error: "Mobile Pioneer reward result missing" },
      500,
    );
  }

  return jsonResponse({
    verified: true,
    keyVerified: true,
    awarded:
      Boolean(rewardRow.awarded),
    rewardGp:
      Number(rewardRow.reward_gp ?? 0),
    totalGp:
      Number(rewardRow.total_gp ?? 0),
    ledgerId:
      rewardRow.ledger_id ?? null,
  });
});

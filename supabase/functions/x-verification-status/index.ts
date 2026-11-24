import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};
const reply = (
  status: string,
  verified = false,
  builderId?: string,
  code = 200,
  recoveryState?: string,
) =>
  Response.json({
    status,
    verified,
    pending: status === "pending" || status === "relinked",
    ...(recoveryState ? { recovery_state: recoveryState } : {}),
    ...(builderId ? { builder_id: builderId } : {}),
  }, { status: code, headers });

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers });
    if (req.method !== "GET") {
      return reply("unavailable", false, undefined, 405);
    }
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)
      ?.[1];
    if (!token) return reply("invalid_session", false, undefined, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !secret) {
      return reply("unavailable", false, undefined, 503);
    }
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
      },
    };
    try {
      // Auth verifies the JWT remotely. No request body, query or JWT payload supplies the ID.
      const client = createClient(url, anon, options);
      const { data: { user }, error } = await client.auth.getUser(token);
      if (error || !user) {
        return reply(
          error && (!error.status || error.status >= 500)
            ? "unavailable"
            : "invalid_session",
          false,
          undefined,
          error && (!error.status || error.status >= 500) ? 503 : 401,
        );
      }
      const id = user.id;
      const admin = createClient(url, secret, options);
      const readReset = () =>
        admin.from("builder_x_oauth_resets").select(
          "builder_id,status,old_provider_user_id,old_auth_identity_id,reset_at,reward_idempotency_key",
        ).eq("builder_id", id).maybeSingle();
      const resetResult = await readReset();
      if (resetResult.error) return reply("unavailable", false, id, 503);
      const reset = resetResult.data;
      if (reset && reset.builder_id !== id) {
        return reply("unavailable", false, id, 503);
      }
      if (reset?.status === "pending" || reset?.status === "relinked") {
          // BOBU X RECOVERY V6: read-only classification.
          const rawIdentities = user.identities;

          const resetAt = Date.parse(reset.reset_at);

          const validReset =
            typeof reset.old_provider_user_id === "string" &&
            reset.old_provider_user_id.trim().length > 0 &&
            Number.isFinite(resetAt);

          const validIdentityList =
            Array.isArray(rawIdentities) &&
            rawIdentities.every(
              item =>
                item != null &&
                typeof item.provider === "string" &&
                item.user_id === id
            );

          const identities = validIdentityList
            ? rawIdentities.filter(item => item.provider === "x")
            : [];

          let recoveryState = "review_required";

          if (validReset && validIdentityList) {
            if (identities.length === 0) {
              recoveryState = "missing_identity";
            } else if (identities.length === 1) {
              const current = identities[0];
              const providerId = current.id;
              const subject = current.identity_data?.sub;
              const createdAt = Date.parse(current.created_at ?? "");

              if (
                typeof providerId !== "string" ||
                !providerId.trim() ||
                typeof current.identity_id !== "string" ||
                !current.identity_id.trim() ||
                !Number.isFinite(createdAt) ||
                (subject != null && subject !== providerId)
              ) {
                recoveryState = "review_required";
              } else if (providerId !== reset.old_provider_user_id) {
                recoveryState = "different_identity";
              } else if (
                current.identity_id === reset.old_auth_identity_id ||
                createdAt <= resetAt
              ) {
                recoveryState = "old_identity";
              } else if (subject === providerId) {
                recoveryState = "fresh_identity";
              }
            }
          }

          // BOBU_X_RECOVERY_V6_RPC_GUARD
          if (recoveryState === "fresh_identity") {
            const proof = await admin.rpc(
              "verify_fresh_x_oauth_identity",
              {
                p_builder_id: id,
                p_provider_user_id: reset.old_provider_user_id,
              }
            );

            if (proof.error) {
              return reply("unavailable", false, id, 503);
            }

            if (proof.data !== true) {
              recoveryState = "review_required";
            }
          }

          const finalReset = await readReset();

          if (
            finalReset.error ||
            JSON.stringify(finalReset.data) !== JSON.stringify(reset)
          ) {
            return reply("unavailable", false, id, 503);
          }

          return reply(reset.status, false, id, 200, recoveryState);
        }
      if (reset && reset.status !== "rewarded") {
        return reply("unavailable", false, id, 503);
      }
      const status = reset ? "rewarded" : "no_reset";
      const social = await admin.from("builder_social_identities").select(
        "builder_id,provider_user_id,verified,reward_claimed",
      ).eq("builder_id", id).eq("provider", "x").maybeSingle();
      if (social.error) return reply("unavailable", false, id, 503);
      const identity = social.data;
      if (
        !identity || identity.builder_id !== id || !identity.provider_user_id ||
        identity.verified !== true || identity.reward_claimed !== true
      ) return reply(status, false, id);
      const authIdentity = user.identities?.find((i) =>
        i.provider === "x" && i.user_id === id &&
        i.identity_data?.sub === identity.provider_user_id
      );
      if (!authIdentity) return reply(status, false, id);

      // Explicitly approved exception for ONE owner-controlled recovery account.
      // Original reset/ledger records stay immutable. Other Builders MUST use
      // the normal original-X-account path and must never query this exception.
      const transferBuilder = "b0254257-5633-4050-a90d-59160c631e7a";
      const transferOldX = "1653100813525344262";
      const transferNewX = "1495411852553109515";
      let approvedTransfer = false;
      if (reset && reset.old_provider_user_id !== identity.provider_user_id &&
          id === transferBuilder && reset.status === "rewarded" &&
          reset.old_provider_user_id === transferOldX &&
          identity.provider_user_id === transferNewX) {
        const approval = await admin.from("builder_x_account_transfers")
          .select("builder_id,old_provider_user_id,new_provider_user_id")
          .eq("builder_id", transferBuilder).maybeSingle();
        if (approval.error) return reply("unavailable", false, id, 503);
        const record = approval.data;
        approvedTransfer = Boolean(
          record && record.builder_id === transferBuilder &&
          record.old_provider_user_id === transferOldX &&
          record.new_provider_user_id === transferNewX
        );
      }
      if (
        reset &&
        ((!approvedTransfer &&
          reset.old_provider_user_id !== identity.provider_user_id) ||
          authIdentity.identity_id === reset.old_auth_identity_id ||
          !(Date.parse(authIdentity.created_at ?? "") >
            Date.parse(reset.reset_at)))
      ) return reply(status, false, id);
      const key = reset?.reward_idempotency_key ??
        `social-verification:x:${id}`;
      const credit = await admin.from("builder_reward_ledger").select(
        "builder_id,idempotency_key,amount,entry_type,reward_type,provider",
      ).eq("builder_id", id).eq("idempotency_key", key).eq("provider", "x").eq(
        "entry_type",
        "credit",
      ).eq("reward_type", "social_verification").maybeSingle();
      if (credit.error) return reply("unavailable", false, id, 503);
      // Re-read the registry after evidence collection; a concurrent reset fails closed.
      const finalReset = await readReset();
      if (
        finalReset.error ||
        JSON.stringify(finalReset.data) !== JSON.stringify(reset)
      ) return reply("unavailable", false, id, 503);
      const reward = credit.data;
      return reply(
        status,
        !!reward && reward.builder_id === id &&
          reward.idempotency_key === key && reward.provider === "x" &&
          reward.entry_type === "credit" &&
          reward.reward_type === "social_verification" &&
          Number(reward.amount) === 5000,
        id,
      );
    } catch {
      return reply("unavailable", false, undefined, 503);
    }
  },
};

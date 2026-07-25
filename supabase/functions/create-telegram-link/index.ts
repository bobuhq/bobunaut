import "@supabase/functions-js/edge-runtime.d.ts";
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
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Required Supabase environment variables are missing.");

      return jsonResponse(
        { error: "Server configuration is incomplete." },
        500,
      );
    }

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentication is required." },
        401,
      );
    }

    const accessToken = authorization.slice("Bearer ".length).trim();

    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("User authentication failed:", userError?.message);

      return jsonResponse(
        { error: "Invalid or expired session." },
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

    const rawToken = generateToken();
    const tokenHash = await sha256(rawToken);
    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    ).toISOString();

    // Invalidate earlier unused Telegram tokens for this Builder.
    const { error: invalidateError } = await adminClient
      .from("builder_verification_tokens")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("builder_id", user.id)
      .eq("provider", "telegram")
      .is("used_at", null);

    if (invalidateError) {
      console.error(
        "Previous token invalidation failed:",
        invalidateError.message,
      );

      return jsonResponse(
        { error: "Could not prepare Telegram verification." },
        500,
      );
    }

    const { error: insertError } = await adminClient
      .from("builder_verification_tokens")
      .insert({
        builder_id: user.id,
        provider: "telegram",
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Token insert failed:", insertError.message);

      return jsonResponse(
        { error: "Could not create Telegram verification link." },
        500,
      );
    }

    const telegramUrl =
      `https://t.me/BOBUVerifyBot?start=${encodeURIComponent(rawToken)}`;

    return jsonResponse({
      ok: true,
      telegram_url: telegramUrl,
      expires_at: expiresAt,
    });
  },
};

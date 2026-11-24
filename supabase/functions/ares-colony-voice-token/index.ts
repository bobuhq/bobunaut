import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken, TrackSource } from "npm:livekit-server-sdk@2.20.1";

const allowedOrigins = new Set([
  "https://bobunaut.com",
  "https://www.bobunaut.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function respond(
  body: Record<string, unknown>,
  status: number,
  origin: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, x-client-info, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get("origin") ?? "";

  if (!allowedOrigins.has(origin)) {
    return new Response(null, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers":
          "authorization, apikey, x-client-info, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return respond({ error: "METHOD_NOT_ALLOWED" }, 405, origin);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  if (!match) {
    return respond({ error: "AUTH_REQUIRED" }, 401, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return respond({ error: "SERVICE_NOT_CONFIGURED" }, 503, origin);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authorization },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: identity, error: identityError } = await client.auth.getUser(
    match[1],
  );

  if (identityError || !identity.user) {
    return respond({ error: "INVALID_SESSION" }, 401, origin);
  }

  const authenticatedBuilderId = identity.user.id;

  // Existing server-authoritative RPC checks auth.uid(),
  // active colony membership, and active colony status.
  const { data, error } = await client.rpc(
    "get_my_mars_colony_resources",
  );

  if (error || !Array.isArray(data) || data.length !== 1) {
    return respond({ error: "ACTIVE_COLONY_REQUIRED" }, 403, origin);
  }

  const colonyId: unknown = data[0]?.colony_id;

  if (
    typeof colonyId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      colonyId,
    )
  ) {
    return respond({ error: "INVALID_COLONY" }, 403, origin);
  }

  const livekitUrl = Deno.env.get("LIVEKIT_URL");
  const livekitKey = Deno.env.get("LIVEKIT_API_KEY");
  const livekitSecret = Deno.env.get("LIVEKIT_API_SECRET");

  if (
    !livekitUrl ||
    !livekitUrl.startsWith("wss://") ||
    !livekitKey ||
    !livekitSecret
  ) {
    return respond({ error: "VOICE_NOT_CONFIGURED" }, 503, origin);
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function getCurrentGeneration(): Promise<string | null> {
    const { data: rows, error: generationError } = await client.rpc(
      "ares_voice_get_my_generation_v1",
    );

    if (
      generationError ||
      !Array.isArray(rows) ||
      rows.length !== 1
    ) {
      return null;
    }

    const row = rows[0];

    if (
      row.builder_id !== authenticatedBuilderId ||
      row.colony_id !== colonyId ||
      typeof row.generation_id !== "string" ||
      !uuidPattern.test(row.generation_id)
    ) {
      return null;
    }

    return row.generation_id;
  }

  const generationId = await getCurrentGeneration();

  if (!generationId) {
    return respond(
      {
        error: "VOICE_GENERATION_REQUIRED",
      },
      403,
      origin,
    );
  }

  const participantIdentity = `${authenticatedBuilderId}:${generationId}`;

  const room = `ares-colony-${colonyId}`;

  try {
    const token = new AccessToken(livekitKey, livekitSecret, {
      identity: participantIdentity,
      ttl: 60,
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
    });

    const jwt = await token.toJwt();

    const confirmedGeneration = await getCurrentGeneration();

    if (confirmedGeneration !== generationId) {
      return respond(
        {
          error: "VOICE_GENERATION_CHANGED",
        },
        409,
        origin,
      );
    }

    return respond(
      {
        url: livekitUrl,
        token: jwt,
        generationId,
        expiresIn: 60,
      },
      200,
      origin,
    );
  } catch {
    return respond({ error: "VOICE_TOKEN_FAILED" }, 503, origin);
  }
});

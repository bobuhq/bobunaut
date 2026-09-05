import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

type PurchaseBody = {
  anchorX?: number;
  anchorY?: number;
  targetX?: number;
  targetY?: number;
  colorKey?: string | null;
  idempotencyKey?: string;
};

function isCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 999
  );
}

function normalizeColorKey(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "AUTO"
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^RAINBOW_(0[1-9]|1[0-9]|20)$/.test(value)
  ) {
    return value;
  }

  throw new Error("INVALID_COLOR_KEY");
}

Deno.serve(async (req) => {
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
    Deno.env.get("SUPABASE_ANON_KEY");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    return jsonResponse(
      { error: "Server configuration error." },
      500,
    );
  }

  const authorization =
    req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(
      { error: "Authentication required." },
      401,
    );
  }

  const accessToken =
    authorization.slice("Bearer ".length).trim();

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
    error: authError,
  } = await userClient.auth.getUser(accessToken);

  if (authError || !user) {
    return jsonResponse(
      { error: "Invalid or expired session." },
      401,
    );
  }

  let body: PurchaseBody;

  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body." },
      400,
    );
  }

  if (
    !isCoordinate(body.anchorX) ||
    !isCoordinate(body.anchorY) ||
    !isCoordinate(body.targetX) ||
    !isCoordinate(body.targetY)
  ) {
    return jsonResponse(
      { error: "Invalid Mars Pixel coordinates." },
      400,
    );
  }

  let colorKey: string | null;

  try {
    colorKey = normalizeColorKey(body.colorKey);
  } catch {
    return jsonResponse(
      { error: "Invalid territory color." },
      400,
    );
  }

  const idempotencyKey =
    typeof body.idempotencyKey === "string"
      ? body.idempotencyKey.trim()
      : "";

  if (
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 160
  ) {
    return jsonResponse(
      { error: "Invalid idempotency key." },
      400,
    );
  }

  const {
    data: testAccessData,
    error: testAccessError,
  } = await userClient.rpc(
    "get_my_mars_pixel_test_access_v1",
  );

  if (testAccessError) {
    console.error(
      "Mars Pixel test access lookup failed:",
      testAccessError.message,
    );
  }

  if (testAccessData === true) {
    const {
      data: testPurchaseData,
      error: testPurchaseError,
    } = await userClient.rpc(
      "execute_mars_pixel_admin_test_purchase_v1",
      {
        p_anchor_x: body.anchorX,
        p_anchor_y: body.anchorY,
        p_target_x: body.targetX,
        p_target_y: body.targetY,
        p_requested_color_key: colorKey,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (testPurchaseError) {
      console.error(
        "Mars Pixel admin test purchase failed:",
        testPurchaseError.message,
      );

      return jsonResponse(
        { error: testPurchaseError.message },
        testPurchaseError.message.includes(
          "MARS_PIXEL_COMMERCIAL_LOCKED",
        )
          ? 423
          : 409,
      );
    }

    if (
      !testPurchaseData ||
      testPurchaseData.success !== true
    ) {
      return jsonResponse(
        { error: "Admin test purchase returned no result." },
        500,
      );
    }

    return jsonResponse(testPurchaseData);
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

  const { data: advertisers, error: advertiserError } =
    await adminClient
      .from("mars_advertisers")
      .select("id,status")
      .eq("owner_builder_id", user.id)
      .in("status", ["under_review", "active"])
      .order("created_at", { ascending: true })
      .limit(1);

  if (advertiserError) {
    console.error(
      "Mars advertiser lookup failed:",
      advertiserError.message,
    );

    return jsonResponse(
      { error: "Unable to resolve Mars advertiser." },
      500,
    );
  }

  const advertiser = advertisers?.[0];

  if (!advertiser) {
    return jsonResponse(
      {
        error: "MARS_PIXEL_ADVERTISER_REQUIRED",
        requiresAdvertiser: true,
      },
      409,
    );
  }

  const {
    data: reservationData,
    error: reservationError,
  } = await userClient.rpc(
    "reserve_mars_pixel_selection_v1",
    {
      p_anchor_x: body.anchorX,
      p_anchor_y: body.anchorY,
      p_target_x: body.targetX,
      p_target_y: body.targetY,
    },
  );

  if (reservationError) {
    console.error(
      "Mars reservation failed:",
      reservationError.message,
    );

    const commercialLocked =
      reservationError.message.includes(
        "MARS_PIXEL_COMMERCIAL_LOCKED",
      );

    return jsonResponse(
      {
        error: commercialLocked
          ? "MARS_PIXEL_COMMERCIAL_LOCKED"
          : reservationError.message,
      },
      commercialLocked ? 423 : 409,
    );
  }

  const reservation =
    Array.isArray(reservationData)
      ? reservationData[0]
      : reservationData;

  if (!reservation?.reservation_id) {
    return jsonResponse(
      { error: "Reservation returned no result." },
      500,
    );
  }

  const {
    data: purchaseData,
    error: purchaseError,
  } = await adminClient.rpc(
    "prepare_mars_pixel_purchase_v1",
    {
      p_builder_id: user.id,
      p_reservation_id:
        reservation.reservation_id,
      p_idempotency_key:
        idempotencyKey,
    },
  );

  if (purchaseError) {
    console.error(
      "Mars purchase preparation failed:",
      purchaseError.message,
    );

    return jsonResponse(
      { error: purchaseError.message },
      409,
    );
  }

  const purchase =
    Array.isArray(purchaseData)
      ? purchaseData[0]
      : purchaseData;

  if (!purchase?.purchase_intent_id) {
    return jsonResponse(
      {
        error:
          "Purchase preparation returned no result.",
      },
      500,
    );
  }

  const {
    data: commitData,
    error: commitError,
  } = await adminClient.rpc(
    "commit_mars_pixel_gp_purchase_v1",
    {
      p_purchase_intent_id:
        purchase.purchase_intent_id,
      p_advertiser_id:
        advertiser.id,
      p_requested_color_key:
        colorKey,
    },
  );

  if (commitError) {
    console.error(
      "Mars purchase commit failed:",
      commitError.message,
    );

    return jsonResponse(
      { error: commitError.message },
      409,
    );
  }

  const committed =
    Array.isArray(commitData)
      ? commitData[0]
      : commitData;

  return jsonResponse({
    success: true,
    reservation,
    purchase,
    allocation: committed ?? null,
  });
});

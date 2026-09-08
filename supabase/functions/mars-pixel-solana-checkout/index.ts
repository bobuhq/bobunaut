import { createClient } from "@supabase/supabase-js";

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

type CheckoutBody = {
  anchorX?: number;
  anchorY?: number;
  targetX?: number;
  targetY?: number;
  buyerWallet?: string;
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

function isSolanaAddress(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim())
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(
      { error: "Server configuration error." },
      500,
    );
  }

  const authorization = req.headers.get("Authorization");

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

  let body: CheckoutBody;

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

  const buyerWallet =
    typeof body.buyerWallet === "string"
      ? body.buyerWallet.trim()
      : "";

  if (!isSolanaAddress(buyerWallet)) {
    return jsonResponse(
      { error: "Invalid Solana buyer wallet." },
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
   * Idempotent checkout replay.
   *
   * IMPORTANT:
   * Before creating a new reservation, look for an existing
   * Solana payment order owned by this builder with the same
   * idempotency key.
   *
   * This prevents a retry from colliding with the builder's
   * own active reservation after the first checkout preparation.
   *
   * Reservation overlap / protected-zone / owned-territory
   * enforcement remains entirely database-authoritative.
   */
  const xStart = Math.min(body.anchorX, body.targetX);
  const yStart = Math.min(body.anchorY, body.targetY);
  const xEnd = Math.max(body.anchorX, body.targetX);
  const yEnd = Math.max(body.anchorY, body.targetY);
  const selectionWidth = xEnd - xStart + 1;
  const selectionHeight = yEnd - yStart + 1;

  const {
    data: existingOrder,
    error: existingOrderError,
  } = await adminClient
    .from("mars_pixel_solana_payment_orders")
    .select(
      [
        "id",
        "reservation_id",
        "x_start",
        "y_start",
        "width",
        "height",
        "buyer_wallet",
        "payment_status",
        "expires_at",
      ].join(","),
    )
    .eq("builder_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingOrderError) {
    console.error(
      "Mars SOL idempotency lookup failed:",
      existingOrderError.message,
    );

    return jsonResponse(
      { error: "MARS_PIXEL_SOLANA_IDEMPOTENCY_LOOKUP_FAILED" },
      500,
    );
  }

  let reservationId: string | null = null;

  if (existingOrder) {
    const sameWallet =
      existingOrder.buyer_wallet === buyerWallet;

    const sameGeometry =
      existingOrder.x_start === xStart &&
      existingOrder.y_start === yStart &&
      existingOrder.width === selectionWidth &&
      existingOrder.height === selectionHeight;

    if (!sameWallet) {
      return jsonResponse(
        { error: "MARS_PIXEL_SOLANA_WALLET_CONFLICT" },
        409,
      );
    }

    if (!sameGeometry) {
      return jsonResponse(
        { error: "MARS_PIXEL_SOLANA_IDEMPOTENCY_CONFLICT" },
        409,
      );
    }

    const existingExpiresAt =
      typeof existingOrder.expires_at === "string"
        ? Date.parse(existingOrder.expires_at)
        : NaN;

    if (
      existingOrder.payment_status === "expired" ||
      (
        Number.isFinite(existingExpiresAt) &&
        existingExpiresAt <= Date.now()
      )
    ) {
      return jsonResponse(
        { error: "MARS_PIXEL_SOLANA_CHECKOUT_EXPIRED" },
        409,
      );
    }

    reservationId = existingOrder.reservation_id;
  } else {
    /*
     * First checkout attempt only:
     * create a new user-scoped reservation.
     */
    const {
      data: reservationData,
      error: reservationError,
    } = await userClient.rpc(
      "reserve_mars_pixel_selection_solana_devnet_v1",
      {
        p_anchor_x: body.anchorX,
        p_anchor_y: body.anchorY,
        p_target_x: body.targetX,
        p_target_y: body.targetY,
      },
    );

    if (reservationError) {
      console.error(
        "Mars SOL reservation failed:",
        reservationError.message,
      );

      const commercialLocked =
        reservationError.message.includes(
          "MARS_PIXEL_COMMERCIAL_LOCKED",
        ) ||
        reservationError.message.includes(
          "MARS_PIXEL_COMMERCIAL_NETWORK_LOCKED",
        ) ||
        reservationError.message.includes(
          "MARS_PIXEL_SOLANA_DEVNET_LOCKED",
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

    reservationId =
      reservation?.reservation_id ??
      reservation?.id ??
      null;
  }

  if (!reservationId) {
    return jsonResponse(
      { error: "Reservation returned no result." },
      500,
    );
  }

  /*
   * Trusted pricing/order creation.
   * The browser never supplies amount, treasury,
   * pricing version or payment reference.
   */
  const {
    data: orderData,
    error: orderError,
  } = await adminClient.rpc(
    "prepare_mars_pixel_solana_payment_v1",
    {
      p_builder_id: user.id,
      p_reservation_id: reservationId,
      p_buyer_wallet: buyerWallet,
      p_idempotency_key: idempotencyKey,
    },
  );

  if (orderError) {
    console.error(
      "Mars SOL payment preparation failed:",
      orderError.message,
    );

    return jsonResponse(
      { error: orderError.message },
      409,
    );
  }

  const order =
    Array.isArray(orderData)
      ? orderData[0]
      : orderData;

  if (
    !order?.payment_order_id ||
    !order?.treasury_address ||
    !order?.payment_reference ||
    order?.amount_lamports === undefined ||
    order?.amount_lamports === null
  ) {
    return jsonResponse(
      { error: "Payment preparation returned no result." },
      500,
    );
  }

  /*
   * Return only public checkout facts.
   *
   * paymentReference MUST be placed verbatim in an
   * SPL Memo instruction by the wallet transaction.
   *
   * amountLamports is authoritative. Frontend must
   * never recalculate the SOL amount.
   */
  return jsonResponse({
    success: true,
    paymentOrderId: order.payment_order_id,
    reservationId: order.reservation_id,
    network: order.network,
    treasuryAddress: order.treasury_address,
    buyerWallet: order.buyer_wallet,
    amountLamports: order.amount_lamports,
    paymentReference: order.payment_reference,
    pricingVersion: order.pricing_version,
    lamportsPerPixel: order.lamports_per_pixel,
    pixelCount: order.pixel_count,
    expiresAt: order.expires_at,
  });
});

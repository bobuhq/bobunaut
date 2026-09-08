import { supabase } from "../../lib/supabase";

export type MarsPixelNetworkStatus = {
  grid_width: number;
  grid_height: number;
  grid_version: number;
  commercial_status:
    | "locked"
    | "preview"
    | "active"
    | "paused"
    | "archived";
  activated_at: string | null;
  total_pixels: number;
  reserved_pixels: number;
  owned_pixels: number;
};

export type MarsPixelPublicAllocation = {
  allocation_id: string;
  x_start: number;
  y_start: number;
  width: number;
  height: number;
  advertiser_name: string | null;
  creative_title: string | null;
  creative_image_url: string | null;
  color_key: string | null;
  destination_url: string | null;
  cta_label: string | null;
};

export type MarsPixelPublicReservedZone = {
  zone_code: string;
  zone_name: string;
  reservation_type:
    | "system"
    | "exploration"
    | "protected";
  x_start: number;
  y_start: number;
  width: number;
  height: number;
  permanent: boolean;
};

export type MarsPixelBlockDetail = {
  block_x: number;
  block_y: number;
  x_start: number;
  y_start: number;
  x_end: number;
  y_end: number;
  width: number;
  height: number;
  pixel_count: number;
  grid_version: number;
  block_status:
    | "available"
    | "reserved"
    | "owned";
  purchasable: boolean;
  reserved_zone_code: string | null;
  reserved_zone_name: string | null;
  allocation_id: string | null;
  advertiser_name: string | null;
  creative_title: string | null;
  creative_image_url: string | null;
  destination_url: string | null;
};

export type MarsPixelSelectionDetail = {
  block_x_start: number;
  block_y_start: number;
  block_x_end: number;
  block_y_end: number;
  x_start: number;
  y_start: number;
  x_end: number;
  y_end: number;
  width: number;
  height: number;
  block_columns: number;
  block_rows: number;
  block_count: number;
  pixel_count: number;
  grid_version: number;
  selection_status:
    | "available"
    | "reserved"
    | "owned";
  purchasable: boolean;
  reserved_overlap_count: number;
  owned_overlap_count: number;
  reserved_zone_code: string | null;
  reserved_zone_name: string | null;
};

export type MarsPixelCoordinateDetail = {
  x: number;
  y: number;
  grid_version: number;
  pixel_status: "available" | "reserved" | "owned";
  purchasable: boolean;
  reserved_zone_code: string | null;
  reserved_zone_name: string | null;
  allocation_id: string | null;
  advertiser_name: string | null;
  creative_title: string | null;
  creative_image_url: string | null;
  destination_url: string | null;
};

export type MarsPixelTerritoryColorOption = {
  color_key: string;
  allowed: boolean;
  adjacent: boolean;
  usage_count: number;
  auto_rank: number;
};

export async function getMarsPixelNetworkStatus(): Promise<MarsPixelNetworkStatus> {
  const { data, error } = await supabase.rpc(
    "get_mars_pixel_network_status",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsPixelNetworkStatus[] | null;
  const status = rows?.[0];

  if (!status) {
    throw new Error(
      "Mars Pixel Network status returned no result.",
    );
  }

  return {
    ...status,
    grid_width: Number(status.grid_width),
    grid_height: Number(status.grid_height),
    grid_version: Number(status.grid_version),
    total_pixels: Number(status.total_pixels),
    reserved_pixels: Number(status.reserved_pixels),
    owned_pixels: Number(status.owned_pixels),
  };
}

export async function getMarsPixelPublicAllocations(): Promise<
  MarsPixelPublicAllocation[]
> {
  const { data, error } = await supabase.rpc(
    "get_mars_pixel_public_allocations",
  );

  if (error) {
    throw error;
  }

  return (
    (data as MarsPixelPublicAllocation[] | null)?.map(
      (allocation) => ({
        ...allocation,
        x_start: Number(allocation.x_start),
        y_start: Number(allocation.y_start),
        width: Number(allocation.width),
        height: Number(allocation.height),
      }),
    ) ?? []
  );
}

export async function getMarsPixelPublicReservedZones(): Promise<
  MarsPixelPublicReservedZone[]
> {
  const { data, error } = await supabase.rpc(
    "get_mars_pixel_public_reserved_zones",
  );

  if (error) {
    throw error;
  }

  return (
    (data as MarsPixelPublicReservedZone[] | null)?.map(
      (zone) => ({
        ...zone,
        x_start: Number(zone.x_start),
        y_start: Number(zone.y_start),
        width: Number(zone.width),
        height: Number(zone.height),
        permanent: zone.permanent === true,
      }),
    ) ?? []
  );
}

export async function getMarsPixelBlockAtCoordinate(
  x: number,
  y: number,
): Promise<MarsPixelBlockDetail> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_mars_pixel_block_at_coordinate",
    {
      p_x: x,
      p_y: y,
    },
  );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!row) {
    throw new Error(
      "Mars Pixel block detail was not returned.",
    );
  }

  return row as MarsPixelBlockDetail;
}

export async function getMarsPixelSelectionDetail(
  anchorX: number,
  anchorY: number,
  targetX: number,
  targetY: number,
): Promise<MarsPixelSelectionDetail> {
  const coordinates = [
    anchorX,
    anchorY,
    targetX,
    targetY,
  ];

  if (
    coordinates.some(
      (value) => !Number.isInteger(value),
    )
  ) {
    throw new Error(
      "Mars Pixel selection must use integer grid values.",
    );
  }

  const { data, error } = await supabase.rpc(
    "get_mars_pixel_selection_detail",
    {
      p_anchor_x: anchorX,
      p_anchor_y: anchorY,
      p_target_x: targetX,
      p_target_y: targetY,
    },
  );

  if (error) {
    throw error;
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!row) {
    throw new Error(
      "Mars Pixel selection detail was not returned.",
    );
  }

  const detail =
    row as MarsPixelSelectionDetail;

  return {
    ...detail,
    block_x_start:
      Number(detail.block_x_start),
    block_y_start:
      Number(detail.block_y_start),
    block_x_end:
      Number(detail.block_x_end),
    block_y_end:
      Number(detail.block_y_end),
    x_start: Number(detail.x_start),
    y_start: Number(detail.y_start),
    x_end: Number(detail.x_end),
    y_end: Number(detail.y_end),
    width: Number(detail.width),
    height: Number(detail.height),
    block_columns:
      Number(detail.block_columns),
    block_rows:
      Number(detail.block_rows),
    block_count:
      Number(detail.block_count),
    pixel_count:
      Number(detail.pixel_count),
    grid_version:
      Number(detail.grid_version),
    purchasable:
      detail.purchasable === true,
    reserved_overlap_count:
      Number(detail.reserved_overlap_count),
    owned_overlap_count:
      Number(detail.owned_overlap_count),
  };
}

export type MarsPixelSelectionValuation = {
  pixel_count: number;
  standard_pixel_count: number;
  polar_pixel_count: number;
  reference_currency_code: string;
  standard_price_per_pixel_minor: number;
  polar_price_per_pixel_minor: number;
  total_reference_value_minor: number;
  minimum_purchase_pixels: number;

  // V23 pixel-native commercial settlement quote.
  quote_status: string;
  quotable: boolean;
  settlement_currency_code: string | null;
  settlement_price_per_pixel: number | null;
  settlement_total_price: number | null;
};

export async function getMarsPixelSelectionValuation(
  anchorX: number,
  anchorY: number,
  targetX: number,
  targetY: number,
): Promise<MarsPixelSelectionValuation> {
  const coordinates = [
    anchorX,
    anchorY,
    targetX,
    targetY,
  ];

  if (
    coordinates.some(
      (value) => !Number.isInteger(value),
    )
  ) {
    throw new Error(
      "Mars Pixel valuation must use integer grid values.",
    );
  }

  const [
    valuationResult,
    quoteResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_mars_pixel_selection_valuation_v1",
      {
        p_anchor_x: anchorX,
        p_anchor_y: anchorY,
        p_target_x: targetX,
        p_target_y: targetY,
      },
    ),
    supabase.rpc(
      "get_mars_pixel_quote_v2",
      {
        p_anchor_x: anchorX,
        p_anchor_y: anchorY,
        p_target_x: targetX,
        p_target_y: targetY,
      },
    ),
  ]);

  if (valuationResult.error) {
    throw valuationResult.error;
  }

  if (quoteResult.error) {
    throw quoteResult.error;
  }

  const row =
    Array.isArray(valuationResult.data)
      ? valuationResult.data[0]
      : valuationResult.data;

  const quoteRow =
    Array.isArray(quoteResult.data)
      ? quoteResult.data[0]
      : quoteResult.data;

  if (!row) {
    throw new Error(
      "Mars Pixel selection valuation was not returned.",
    );
  }

  if (!quoteRow) {
    throw new Error(
      "Mars Pixel settlement quote was not returned.",
    );
  }

  const valuation =
    row as MarsPixelSelectionValuation;

  const quote = quoteRow as {
    quote_status: string;
    quotable: boolean;
    settlement_currency_code: string | null;
    settlement_price_per_pixel: number | string | null;
    settlement_total_price: number | string | null;
  };

  return {
    ...valuation,
    pixel_count:
      Number(valuation.pixel_count),
    standard_pixel_count:
      Number(valuation.standard_pixel_count),
    polar_pixel_count:
      Number(valuation.polar_pixel_count),
    standard_price_per_pixel_minor:
      Number(valuation.standard_price_per_pixel_minor),
    polar_price_per_pixel_minor:
      Number(valuation.polar_price_per_pixel_minor),
    total_reference_value_minor:
      Number(valuation.total_reference_value_minor),
    minimum_purchase_pixels:
      Number(valuation.minimum_purchase_pixels),

    quote_status:
      quote.quote_status,
    quotable:
      quote.quotable === true,
    settlement_currency_code:
      quote.settlement_currency_code,
    settlement_price_per_pixel:
      quote.settlement_price_per_pixel == null
        ? null
        : Number(quote.settlement_price_per_pixel),
    settlement_total_price:
      quote.settlement_total_price == null
        ? null
        : Number(quote.settlement_total_price),
  };
}

export async function getMarsPixelAtCoordinate(
  x: number,
  y: number,
): Promise<MarsPixelCoordinateDetail> {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y)
  ) {
    throw new Error(
      "Mars Pixel coordinate must use integer grid values.",
    );
  }

  const { data, error } = await supabase.rpc(
    "get_mars_pixel_at_coordinate",
    {
      p_x: x,
      p_y: y,
    },
  );

  if (error) {
    throw error;
  }

  const rows =
    data as MarsPixelCoordinateDetail[] | null;

  const detail = rows?.[0];

  if (!detail) {
    throw new Error(
      "Mars Pixel coordinate returned no result.",
    );
  }

  return {
    ...detail,
    x: Number(detail.x),
    y: Number(detail.y),
    grid_version: Number(detail.grid_version),
    purchasable:
      detail.purchasable === true,
  };
}


export async function getMarsPixelTerritoryColorOptions(
  xStart: number,
  yStart: number,
  width: number,
  height: number,
): Promise<MarsPixelTerritoryColorOption[]> {
  const values = [
    xStart,
    yStart,
    width,
    height,
  ];

  if (
    values.some((value) => !Number.isInteger(value)) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error(
      "Mars Pixel territory color request requires valid integer geometry.",
    );
  }

  const { data, error } = await supabase.rpc(
    "get_mars_pixel_territory_color_options_v1",
    {
      p_x_start: xStart,
      p_y_start: yStart,
      p_width: width,
      p_height: height,
    },
  );

  if (error) {
    throw error;
  }

  return (
    (data as MarsPixelTerritoryColorOption[] | null)?.map(
      (option) => ({
        ...option,
        allowed: option.allowed === true,
        adjacent: option.adjacent === true,
        usage_count: Number(option.usage_count),
        auto_rank: Number(option.auto_rank),
      }),
    ) ?? []
  );
}

export type MarsPixelContentTier = {
  tier_key: string;
  min_pixels: number;
  max_pixels: number | null;
  territory_name_max_chars: number;
  description_max_chars: number;
  image_allowed: boolean;
  max_links: number;
  cta_allowed: boolean;
  socials_allowed: boolean;
  analytics_allowed: boolean;
  premium: boolean;
};

export async function getMarsPixelContentTier(
  pixelCount: number,
): Promise<MarsPixelContentTier> {
  if (!Number.isInteger(pixelCount) || pixelCount < 50) {
    throw new Error(
      "Mars Pixel content tier requires at least 50 pixels.",
    );
  }

  const { data, error } = await supabase.rpc(
    "get_mars_pixel_content_tier_v1",
    {
      p_pixel_count: pixelCount,
    },
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error(
      "Mars Pixel content tier returned no result.",
    );
  }

  const tier = row as MarsPixelContentTier;

  return {
    ...tier,
    min_pixels: Number(tier.min_pixels),
    max_pixels:
      tier.max_pixels === null
        ? null
        : Number(tier.max_pixels),
    territory_name_max_chars:
      Number(tier.territory_name_max_chars),
    description_max_chars:
      Number(tier.description_max_chars),
    image_allowed: tier.image_allowed === true,
    max_links: Number(tier.max_links),
    cta_allowed: tier.cta_allowed === true,
    socials_allowed: tier.socials_allowed === true,
    analytics_allowed: tier.analytics_allowed === true,
    premium: tier.premium === true,
  };
}

export type MarsPixelPurchaseResult = {
  success: true;
  reservation: {
    reservation_id: string;
    reservation_status: string;
    expires_at: string;
    x_start: number;
    y_start: number;
    width: number;
    height: number;
    block_count: number;
    pixel_count: number;
    grid_version: number;
  };
  purchase: {
    purchase_intent_id: string;
    purchase_status: string;
    reservation_id: string;
    pixel_count: number;
    currency_code: string;
    total_price: number;
  };
  allocation: {
    purchase_intent_id: string;
    purchase_status: string;
    allocation_id: string;
    gp_ledger_id: string;
    total_price: number;
    personal_gp_spent: number;
    eligible_network_gp_spent: number;
    remaining_personal_gp: number;
    remaining_eligible_network_gp: number;
    remaining_total_gp: number;
  } | null;
};

export async function getMyMarsPixelTestAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_pixel_test_access_v1",
  );

  if (error) {
    return false;
  }

  return data === true;
}

export async function purchaseMarsPixelTerritory(input: {
  anchorX: number;
  anchorY: number;
  targetX: number;
  targetY: number;
  colorKey: string | null;
  idempotencyKey: string;
}): Promise<MarsPixelPurchaseResult> {
  const coordinates = [
    input.anchorX,
    input.anchorY,
    input.targetX,
    input.targetY,
  ];

  if (
    coordinates.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 0 ||
        value > 999,
    )
  ) {
    throw new Error(
      "Mars Pixel purchase requires valid canonical coordinates.",
    );
  }

  const { data, error } = await supabase.functions.invoke(
    "mars-pixel-purchase",
    {
      body: {
        anchorX: input.anchorX,
        anchorY: input.anchorY,
        targetX: input.targetX,
        targetY: input.targetY,
        colorKey: input.colorKey ?? "AUTO",
        idempotencyKey: input.idempotencyKey,
      },
    },
  );

  if (error) {
    let message =
      error.message || "Mars Pixel purchase failed.";

    const context = (error as {
      context?: unknown;
    }).context;

    if (
      typeof Response !== "undefined" &&
      context instanceof Response
    ) {
      const response = context as Response;

      try {
        const payload = await response.clone().json();

        if (payload && typeof payload === "object") {
          const body = payload as Record<string, unknown>;

          const detail =
            typeof body.error === "string"
              ? body.error
              : typeof body.message === "string"
                ? body.message
                : typeof body.detail === "string"
                  ? body.detail
                  : typeof body.code === "string"
                    ? body.code
                    : null;

          if (detail) {
            message = detail;
          }
        }
      } catch {
        try {
          const text = await response.clone().text();

          if (text.trim()) {
            message = text.trim();
          }
        } catch {
        }
      }
    }

    throw new Error(message);
  }

  if (!data || data.success !== true) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Mars Pixel purchase failed.",
    );
  }

  return data as MarsPixelPurchaseResult;
}


export type MarsPixelSolanaCheckoutResult = {
  success: true;
  paymentOrderId: string;
  paymentStatus: string;
  reservationId: string;
  gridVersion: number;
  xStart: number;
  yStart: number;
  width: number;
  height: number;
  pixelCount: number;
  pricingVersion: number;
  lamportsPerPixel: number;
  amountLamports: number;
  network: string;
  treasuryAddress: string;
  buyerWallet: string;
  paymentReference: string;
  expiresAt: string;
};

export type MarsPixelSolanaVerifyResult = {
  success: true;
  paymentOrderId: string;
  paymentStatus: string;
  reservationId: string;
  allocationId: string | null;
  transactionSignature: string;
  transactionSlot: number;
  transactionBlockTime: string;
  verifiedAt: string | null;
};

async function getMarsPixelEdgeFunctionError(
  error: {
    message?: string;
    context?: unknown;
  },
  fallback: string,
): Promise<string> {
  let message = error.message || fallback;
  const context = error.context;

  if (
    typeof Response !== "undefined" &&
    context instanceof Response
  ) {
    const response = context as Response;

    try {
      const payload = await response.clone().json();

      if (payload && typeof payload === "object") {
        const body = payload as Record<string, unknown>;

        const detail =
          typeof body.error === "string"
            ? body.error
            : typeof body.message === "string"
              ? body.message
              : typeof body.detail === "string"
                ? body.detail
                : typeof body.code === "string"
                  ? body.code
                  : null;

        if (detail) {
          message = detail;
        }
      }
    } catch {
      try {
        const body = await response.clone().text();

        if (body.trim()) {
          message = body.trim();
        }
      } catch {
      }
    }
  }

  return message;
}

export async function checkoutMarsPixelSolanaPayment(input: {
  anchorX: number;
  anchorY: number;
  targetX: number;
  targetY: number;
  buyerWallet: string;
  idempotencyKey: string;
}): Promise<MarsPixelSolanaCheckoutResult> {
  const coordinates = [
    input.anchorX,
    input.anchorY,
    input.targetX,
    input.targetY,
  ];

  if (
    coordinates.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 0 ||
        value > 999,
    )
  ) {
    throw new Error(
      "Mars Pixel Solana checkout requires valid canonical coordinates.",
    );
  }

  if (
    typeof input.buyerWallet !== "string" ||
    input.buyerWallet.length < 32 ||
    input.buyerWallet.length > 44
  ) {
    throw new Error("A valid Solana buyer wallet is required.");
  }

  if (
    typeof input.idempotencyKey !== "string" ||
    input.idempotencyKey.length < 8 ||
    input.idempotencyKey.length > 160
  ) {
    throw new Error(
      "A valid Mars Pixel checkout idempotency key is required.",
    );
  }

  const { data, error } = await supabase.functions.invoke(
    "mars-pixel-solana-checkout",
    {
      body: {
        anchorX: input.anchorX,
        anchorY: input.anchorY,
        targetX: input.targetX,
        targetY: input.targetY,
        buyerWallet: input.buyerWallet,
        idempotencyKey: input.idempotencyKey,
      },
    },
  );

  if (error) {
    throw new Error(
      await getMarsPixelEdgeFunctionError(
        error,
        "Mars Pixel Solana checkout failed.",
      ),
    );
  }

  if (!data || data.success !== true) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Mars Pixel Solana checkout failed.",
    );
  }

  return data as MarsPixelSolanaCheckoutResult;
}

export async function verifyMarsPixelSolanaPayment(input: {
  paymentOrderId: string;
  transactionSignature: string;
  colorKey: string | null;
}): Promise<MarsPixelSolanaVerifyResult> {
  if (
    typeof input.paymentOrderId !== "string" ||
    input.paymentOrderId.length < 30
  ) {
    throw new Error("A valid Mars Pixel payment order is required.");
  }

  if (
    typeof input.transactionSignature !== "string" ||
    input.transactionSignature.length < 80
  ) {
    throw new Error(
      "A valid Solana transaction signature is required.",
    );
  }

  const { data, error } = await supabase.functions.invoke(
    "mars-pixel-solana-verify",
    {
      body: {
        paymentOrderId: input.paymentOrderId,
        transactionSignature: input.transactionSignature,
        colorKey: input.colorKey ?? null,
      },
    },
  );

  if (error) {
    throw new Error(
      await getMarsPixelEdgeFunctionError(
        error,
        "Mars Pixel Solana verification failed.",
      ),
    );
  }

  if (!data || data.success !== true) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Mars Pixel Solana verification failed.",
    );
  }

  return data as MarsPixelSolanaVerifyResult;
}

export type MarsPixelCreativeLink = {
  type:
    | "website"
    | "x"
    | "telegram"
    | "instagram"
    | "youtube"
    | "linkedin";
  url: string;
};

export type SaveMarsPixelCreativeInput = {
  allocationId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  destinationUrl?: string;
  ctaLabel?: string;
  links?: MarsPixelCreativeLink[];
};

export type SaveMarsPixelCreativeResult = {
  creative_id: string;
  allocation_id: string;
  pixel_count: number;
  tier_key: string;
  creative_status: string;
};

export async function saveMarsPixelCreative(
  input: SaveMarsPixelCreativeInput,
): Promise<SaveMarsPixelCreativeResult> {
  const { data, error } = await supabase.rpc(
    "save_mars_pixel_creative_v1",
    {
      p_allocation_id: input.allocationId,
      p_title: input.title.trim(),
      p_description: input.description?.trim() || null,
      p_image_url: input.imageUrl?.trim() || null,
      p_destination_url:
        input.destinationUrl?.trim() || null,
      p_cta_label: input.ctaLabel?.trim() || null,
      p_links: input.links ?? [],
    },
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error(
      "Mars Pixel creative submission returned no result.",
    );
  }

  return {
    ...(row as SaveMarsPixelCreativeResult),
    pixel_count: Number(
      (row as SaveMarsPixelCreativeResult).pixel_count,
    ),
  };
}

export type MarsPixelCreativeImageUpload = {
  publicUrl: string;
  objectPath: string;
};

export async function uploadMarsPixelCreativeImage(
  allocationId: string,
  file: File,
): Promise<MarsPixelCreativeImageUpload> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
  ) {
    throw new Error("MARS_PIXEL_IMAGE_TYPE_NOT_ALLOWED");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("MARS_PIXEL_IMAGE_TOO_LARGE");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("MARS_PIXEL_AUTH_REQUIRED");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const safeAllocationId = allocationId.replace(
    /[^a-zA-Z0-9-]/g,
    "",
  );

  const objectPath =
    `${user.id}/${safeAllocationId}/` +
    `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("mars-pixel-creatives")
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("mars-pixel-creatives")
    .getPublicUrl(objectPath);

  if (!data.publicUrl) {
    throw new Error("MARS_PIXEL_IMAGE_URL_FAILED");
  }

  return {
    publicUrl: data.publicUrl,
    objectPath,
  };
}

export async function deleteMarsPixelCreativeImage(
  objectPath: string,
): Promise<void> {
  const normalizedPath = objectPath.trim();

  if (!normalizedPath) {
    return;
  }

  const { error } = await supabase.storage
    .from("mars-pixel-creatives")
    .remove([normalizedPath]);

  if (error) {
    throw error;
  }
}

export type MarsPixelOwnerCreativeDetail = {
  allocation_id: string;
  pixel_count: number;
  creative_id: string | null;
  creative_status: string | null;
  title: string | null;
  description: string | null;
  image_url: string | null;
  destination_url: string | null;
  cta_label: string | null;
  links: MarsPixelCreativeLink[];
};

export async function getMyMarsPixelCreative(
  allocationId: string,
): Promise<MarsPixelOwnerCreativeDetail | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_my_mars_pixel_creative_v1",
    {
      p_allocation_id: allocationId,
    },
  );

  if (error) {
    if (
      error.code === "42501" ||
      error.code === "P0002" ||
      error.message.includes(
        "MARS_PIXEL_NOT_ALLOCATION_OWNER",
      )
    ) {
      return null;
    }

    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return null;
  }

  const rawLinks: unknown[] = Array.isArray(row.links)
    ? row.links
    : [];

  const links: MarsPixelCreativeLink[] = rawLinks
    .filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" &&
        value !== null,
    )
    .map((value) => ({
      type: String(
        value.type ?? "website",
      ) as MarsPixelCreativeLink["type"],
      url: String(value.url ?? ""),
    }))
    .filter((value) =>
      [
        "website",
        "x",
        "telegram",
        "instagram",
        "youtube",
        "linkedin",
      ].includes(value.type),
    );

  return {
    allocation_id: String(row.allocation_id),
    pixel_count: Number(row.pixel_count),
    creative_id:
      typeof row.creative_id === "string"
        ? row.creative_id
        : null,
    creative_status:
      typeof row.creative_status === "string"
        ? row.creative_status
        : null,
    title:
      typeof row.title === "string"
        ? row.title
        : null,
    description:
      typeof row.description === "string"
        ? row.description
        : null,
    image_url:
      typeof row.image_url === "string"
        ? row.image_url
        : null,
    destination_url:
      typeof row.destination_url === "string"
        ? row.destination_url
        : null,
    cta_label:
      typeof row.cta_label === "string"
        ? row.cta_label
        : null,
    links,
  };
}

export type MarsPixelAdEventType =
  | "impression"
  | "card_open"
  | "cta_click";

export type MarsPixelAdAnalytics = {
  allocation_id: string;
  period_days: number;
  impressions: number;
  card_opens: number;
  cta_clicks: number;
  ctr: number;
  last_event_at: string | null;
};

const MARS_PIXEL_ANALYTICS_SESSION_KEY =
  "bobu_mars_pixel_analytics_session_v1";

function getMarsPixelAnalyticsSessionKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existing =
      window.sessionStorage.getItem(
        MARS_PIXEL_ANALYTICS_SESSION_KEY,
      );

    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    window.sessionStorage.setItem(
      MARS_PIXEL_ANALYTICS_SESSION_KEY,
      generated,
    );

    return generated;
  } catch {
    return null;
  }
}

export async function recordMarsPixelAdEvent(
  allocationId: string,
  eventType: MarsPixelAdEventType,
): Promise<void> {
  if (!allocationId) {
    return;
  }

  const { error } = await supabase.rpc(
    "record_mars_pixel_ad_event_v1",
    {
      p_allocation_id: allocationId,
      p_event_type: eventType,
      p_session_key:
        getMarsPixelAnalyticsSessionKey(),
    },
  );

  if (error) {
    console.warn(
      "[Mars Pixel analytics] event rejected",
      eventType,
      error.message,
    );
    return;
  }

}

export async function getMyMarsPixelAdAnalytics(
  days: 7 | 30 | 90 = 30,
): Promise<MarsPixelAdAnalytics[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "get_my_mars_pixel_ad_analytics_v1",
    {
      p_days: days,
    },
  );

  if (error) {
    throw error;
  }

  const rows: unknown[] =
    Array.isArray(data) ? data : [];

  return rows
    .filter(
      (
        row,
      ): row is Record<string, unknown> =>
        Boolean(
          row &&
            typeof row === "object" &&
            !Array.isArray(row),
        ),
    )
    .map((row) => ({
      allocation_id:
        typeof row.allocation_id === "string"
          ? row.allocation_id
          : "",
      period_days:
        typeof row.period_days === "number"
          ? row.period_days
          : Number(row.period_days ?? days),
      impressions:
        typeof row.impressions === "number"
          ? row.impressions
          : Number(row.impressions ?? 0),
      card_opens:
        typeof row.card_opens === "number"
          ? row.card_opens
          : Number(row.card_opens ?? 0),
      cta_clicks:
        typeof row.cta_clicks === "number"
          ? row.cta_clicks
          : Number(row.cta_clicks ?? 0),
      ctr:
        typeof row.ctr === "number"
          ? row.ctr
          : Number(row.ctr ?? 0),
      last_event_at:
        typeof row.last_event_at === "string"
          ? row.last_event_at
          : null,
    }))
    .filter((row) => row.allocation_id);
}

export type MarsPixelAdvertiserCenterTerritory = {
  allocation_id: string;
  advertiser_id: string;
  advertiser_name: string;
  advertiser_type: string;
  advertiser_status: string;
  allocation_status: string;
  x_start: number;
  y_start: number;
  width: number;
  height: number;
  pixel_count: number;
  color_key: string | null;
  activated_at: string | null;
  allocation_created_at: string;
  creative_id: string | null;
  creative_status: string | null;
  creative_title: string | null;
  creative_description: string | null;
  creative_image_url: string | null;
  creative_destination_url: string | null;
  creative_cta_label: string | null;
  creative_links: MarsPixelCreativeLink[];
  creative_updated_at: string | null;
};

export async function getMyMarsPixelAdvertiserCenter(): Promise<
  MarsPixelAdvertiserCenterTerritory[]
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "get_my_mars_pixel_advertiser_center_v1",
  );

  if (error) {
    throw error;
  }

  const rows: unknown[] = Array.isArray(data) ? data : [];

  return rows
    .filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" &&
        value !== null,
    )
    .map((row) => {
      const rawLinks: unknown[] = Array.isArray(
        row.creative_links,
      )
        ? row.creative_links
        : [];

      const creativeLinks: MarsPixelCreativeLink[] =
        rawLinks
          .filter(
            (
              value,
            ): value is Record<string, unknown> =>
              typeof value === "object" &&
              value !== null,
          )
          .map((value) => ({
            type: String(
              value.type ?? "website",
            ) as MarsPixelCreativeLink["type"],
            url: String(value.url ?? ""),
          }))
          .filter((value) =>
            [
              "website",
              "x",
              "telegram",
              "instagram",
              "youtube",
              "linkedin",
            ].includes(value.type),
          );

      return {
        allocation_id: String(row.allocation_id),
        advertiser_id: String(row.advertiser_id),
        advertiser_name: String(
          row.advertiser_name ?? "",
        ),
        advertiser_type: String(
          row.advertiser_type ?? "",
        ),
        advertiser_status: String(
          row.advertiser_status ?? "",
        ),
        allocation_status: String(
          row.allocation_status ?? "",
        ),
        x_start: Number(row.x_start),
        y_start: Number(row.y_start),
        width: Number(row.width),
        height: Number(row.height),
        pixel_count: Number(row.pixel_count),
        color_key:
          typeof row.color_key === "string"
            ? row.color_key
            : null,
        activated_at:
          typeof row.activated_at === "string"
            ? row.activated_at
            : null,
        allocation_created_at: String(
          row.allocation_created_at ?? "",
        ),
        creative_id:
          typeof row.creative_id === "string"
            ? row.creative_id
            : null,
        creative_status:
          typeof row.creative_status === "string"
            ? row.creative_status
            : null,
        creative_title:
          typeof row.creative_title === "string"
            ? row.creative_title
            : null,
        creative_description:
          typeof row.creative_description === "string"
            ? row.creative_description
            : null,
        creative_image_url:
          typeof row.creative_image_url === "string"
            ? row.creative_image_url
            : null,
        creative_destination_url:
          typeof row.creative_destination_url === "string"
            ? row.creative_destination_url
            : null,
        creative_cta_label:
          typeof row.creative_cta_label === "string"
            ? row.creative_cta_label
            : null,
        creative_links: creativeLinks,
        creative_updated_at:
          typeof row.creative_updated_at === "string"
            ? row.creative_updated_at
            : null,
      };
    });
}

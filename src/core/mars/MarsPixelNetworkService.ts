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
  advertiser_name: string;
  creative_title: string | null;
  creative_image_url: string | null;
  color_key: string | null;
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

  const { data, error } = await supabase.rpc(
    "get_mars_pixel_selection_valuation_v1",
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
      "Mars Pixel selection valuation was not returned.",
    );
  }

  const valuation =
    row as MarsPixelSelectionValuation;

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
    let message = error.message || "Mars Pixel purchase failed.";

    const context = (error as {
      context?: {
        json?: () => Promise<unknown>;
        text?: () => Promise<string>;
      };
    }).context;

    if (context?.json) {
      try {
        const payload = await context.json();

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
        if (context?.text) {
          try {
            const text = await context.text();
            if (text.trim()) {
              message = text.trim();
            }
          } catch {
          }
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

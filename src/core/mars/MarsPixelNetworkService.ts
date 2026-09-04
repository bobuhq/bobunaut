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

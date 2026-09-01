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

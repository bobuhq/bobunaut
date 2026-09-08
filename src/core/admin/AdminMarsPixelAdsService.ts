import { supabase } from "../../lib/supabase";

export type AdminMarsPixelCreativeStatus =
  | "under_review"
  | "active"
  | "suspended"
  | "archived";

export interface AdminMarsPixelCreative {
  creativeId: string;
  allocationId: string;
  advertiserId: string;
  advertiserName: string | null;
  advertiserStatus: string;
  ownerBuilderId: string;
  title: string;
  description: string | null;
  imageUrl: string;
  destinationUrl: string;
  ctaLabel: string | null;
  links: unknown;
  creativeStatus: AdminMarsPixelCreativeStatus;
  xStart: number;
  yStart: number;
  width: number;
  height: number;
  pixelCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminMarsPixelCreativeRow {
  creative_id: string;
  allocation_id: string;
  advertiser_id: string;
  advertiser_name: string | null;
  advertiser_status: string;
  owner_builder_id: string;
  title: string;
  description: string | null;
  image_url: string;
  destination_url: string;
  cta_label: string | null;
  links: unknown;
  creative_status: AdminMarsPixelCreativeStatus;
  x_start: number;
  y_start: number;
  width: number;
  height: number;
  pixel_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminMarsPixelAdsQuery {
  status?: AdminMarsPixelCreativeStatus | null;
  limit?: number;
  offset?: number;
}

function mapCreative(
  row: AdminMarsPixelCreativeRow,
): AdminMarsPixelCreative {
  return {
    creativeId: row.creative_id,
    allocationId: row.allocation_id,
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser_name,
    advertiserStatus: row.advertiser_status,
    ownerBuilderId: row.owner_builder_id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    destinationUrl: row.destination_url,
    ctaLabel: row.cta_label,
    links: row.links,
    creativeStatus: row.creative_status,
    xStart: row.x_start,
    yStart: row.y_start,
    width: row.width,
    height: row.height,
    pixelCount: row.pixel_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const AdminMarsPixelAdsService = {
  async getCreatives(
    query: AdminMarsPixelAdsQuery = {},
  ): Promise<AdminMarsPixelCreative[]> {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit ?? 25), 1),
      100,
    );

    const offset = Math.max(
      Math.trunc(query.offset ?? 0),
      0,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_mars_pixel_creatives_v1",
      {
        p_status:
          query.status === undefined
            ? "under_review"
            : query.status,
        p_limit: limit,
        p_offset: offset,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Mars Pixel Ads: ${error.message}`,
      );
    }

    return ((data ?? []) as AdminMarsPixelCreativeRow[])
      .map(mapCreative);
  },

  async moderateCreative(
    creativeId: string,
    decision: "approve" | "reject",
  ): Promise<void> {
    const { error } = await supabase.rpc(
      "moderate_mars_pixel_creative_v1",
      {
        p_creative_id: creativeId,
        p_decision: decision,
      },
    );

    if (error) {
      throw new Error(
        `Unable to ${decision} Mars Pixel creative: ${error.message}`,
      );
    }
  },
};

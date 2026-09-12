import { supabase } from "../../lib/supabase";
import {
  notifyMarsPixelEmail,
} from "../mars/MarsPixelEmailNotificationService";

export type AdminMarsPixelCreativeStatus =
  | "under_review"
  | "active"
  | "suspended"
  | "archived";

export type AdminMarsPixelAllocationAction =
  | "hide"
  | "restore"
  | "remove_creative"
  | "release";

export interface AdminMarsPixelAllocation {
  allocationId: string;
  allocationStatus: string;
  advertiserId: string | null;
  advertiserName: string | null;
  advertiserStatus: string | null;
  ownerBuilderId: string | null;

  xStart: number;
  yStart: number;
  width: number;
  height: number;
  pixelCount: number;
  colorKey: string | null;

  activatedAt: string | null;
  releasedAt: string | null;

  creativeId: string | null;
  creativeTitle: string | null;
  creativeDescription: string | null;
  creativeImageUrl: string | null;
  creativeDestinationUrl: string | null;
  creativeCtaLabel: string | null;
  creativeLinks: unknown;
  creativeStatus: AdminMarsPixelCreativeStatus | null;

  paymentOrderId: string | null;
  paymentStatus: string | null;
  paymentNetwork: string | null;
  buyerWallet: string | null;
  transactionSignature: string | null;
  amountLamports: number | null;

  createdAt: string;
}

interface AdminMarsPixelAllocationRow {
  allocation_id: string;
  allocation_status: string;
  advertiser_id: string | null;
  advertiser_name: string | null;
  advertiser_status: string | null;
  owner_builder_id: string | null;

  x_start: number;
  y_start: number;
  width: number;
  height: number;
  pixel_count: number;
  color_key: string | null;

  activated_at: string | null;
  released_at: string | null;

  creative_id: string | null;
  creative_title: string | null;
  creative_description: string | null;
  creative_image_url: string | null;
  creative_destination_url: string | null;
  creative_cta_label: string | null;
  creative_links: unknown;
  creative_status: AdminMarsPixelCreativeStatus | null;

  payment_order_id: string | null;
  payment_status: string | null;
  payment_network: string | null;
  buyer_wallet: string | null;
  transaction_signature: string | null;
  amount_lamports: number | null;

  created_at: string;
}

function mapAllocation(
  row: AdminMarsPixelAllocationRow,
): AdminMarsPixelAllocation {
  return {
    allocationId: row.allocation_id,
    allocationStatus: row.allocation_status,
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser_name,
    advertiserStatus: row.advertiser_status,
    ownerBuilderId: row.owner_builder_id,

    xStart: row.x_start,
    yStart: row.y_start,
    width: row.width,
    height: row.height,
    pixelCount: row.pixel_count,
    colorKey: row.color_key,

    activatedAt: row.activated_at,
    releasedAt: row.released_at,

    creativeId: row.creative_id,
    creativeTitle: row.creative_title,
    creativeDescription: row.creative_description,
    creativeImageUrl: row.creative_image_url,
    creativeDestinationUrl: row.creative_destination_url,
    creativeCtaLabel: row.creative_cta_label,
    creativeLinks: row.creative_links,
    creativeStatus: row.creative_status,

    paymentOrderId: row.payment_order_id,
    paymentStatus: row.payment_status,
    paymentNetwork: row.payment_network,
    buyerWallet: row.buyer_wallet,
    transactionSignature: row.transaction_signature,
    amountLamports: row.amount_lamports,

    createdAt: row.created_at,
  };
}

export interface AdminMarsPixelCreativeEditInput {
  creativeId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  destinationUrl?: string | null;
  ctaLabel?: string | null;
  links?: unknown;
  reason: string;
}

export const AdminMarsPixelAdsService = {
  async getAllocations(
    limit = 200,
    offset = 0,
  ): Promise<AdminMarsPixelAllocation[]> {
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit), 1),
      200,
    );

    const safeOffset = Math.max(
      Math.trunc(offset),
      0,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_mars_pixel_allocations_v1",
      {
        p_limit: safeLimit,
        p_offset: safeOffset,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Mars Pixel allocations: ${error.message}`,
      );
    }

    return ((data ?? []) as AdminMarsPixelAllocationRow[])
      .map(mapAllocation);
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

    await notifyMarsPixelEmail(
      decision === "approve"
        ? "approved"
        : "rejected",
      creativeId,
    );
  },

  async manageAllocation(
    allocationId: string,
    action: AdminMarsPixelAllocationAction,
    reason: string,
  ): Promise<void> {
    const { error } = await supabase.rpc(
      "admin_manage_mars_pixel_allocation_v1",
      {
        p_allocation_id: allocationId,
        p_action: action,
        p_reason: reason,
      },
    );

    if (error) {
      throw new Error(
        `Unable to ${action.replace("_", " ")} Mars Pixel allocation: ${error.message}`,
      );
    }
  },

  async editCreative(
    input: AdminMarsPixelCreativeEditInput,
  ): Promise<void> {
    const { error } = await supabase.rpc(
      "admin_edit_mars_pixel_creative_v1",
      {
        p_creative_id: input.creativeId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_image_url: input.imageUrl ?? null,
        p_destination_url: input.destinationUrl ?? null,
        p_cta_label: input.ctaLabel ?? null,
        p_links: input.links ?? [],
        p_reason: input.reason,
      },
    );

    if (error) {
      throw new Error(
        `Unable to edit Mars Pixel creative: ${error.message}`,
      );
    }
  },
};

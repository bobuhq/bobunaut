import { supabase } from "../../../lib/supabase";

export interface SignalCampaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: "x";
  postUrl: string;
  postId: string;
  rewardGp: number;
  requireRepost: boolean;
  requireReply: boolean;
  startsAt: string | null;
  endsAt: string | null;
  verificationStatus: string | null;
  rewardAwarded: boolean;
}

interface SignalCampaignRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: string;
  post_url: string;
  post_id: string;
  reward_gp: number | string;
  require_repost: boolean;
  require_reply: boolean;
  starts_at: string | null;
  ends_at: string | null;
  builder_verification_status: string | null;
  reward_awarded: boolean;
}

export interface SignalVerificationResult {
  accepted?: boolean;
  alreadyClaimed?: boolean;
  campaignId?: string;
  verificationStatus?: string;
  rewardAwarded?: boolean;
  rewardGp?: number;
  error?: string;
  code?: string;
}

function mapSignalCampaign(
  row: SignalCampaignRow,
): SignalCampaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    platform: "x",
    postUrl: row.post_url,
    postId: row.post_id,
    rewardGp: Number(row.reward_gp) || 0,
    requireRepost: row.require_repost,
    requireReply: row.require_reply,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    verificationStatus:
      row.builder_verification_status,
    rewardAwarded: row.reward_awarded,
  };
}

export async function loadSignalCampaigns():
Promise<SignalCampaign[]> {
  const { data, error } = await supabase.rpc(
    "get_active_signal_campaigns",
  );

  if (error) {
    throw new Error(
      `Signal campaigns could not be loaded: ${error.message}`,
    );
  }

  const rows = Array.isArray(data)
    ? (data as SignalCampaignRow[])
    : [];

  return rows.map(mapSignalCampaign);
}

export async function verifySignalCampaign(
  campaignId: string,
): Promise<SignalVerificationResult> {
  const normalizedCampaignId =
    campaignId.trim();

  if (!normalizedCampaignId) {
    throw new Error(
      "Campaign ID is required.",
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      "verify-signal-campaign",
      {
        body: {
          campaign_id:
            normalizedCampaignId,
        },
      },
    );

  if (error) {
    throw new Error(
      `Signal verification failed: ${error.message}`,
    );
  }

  return (data ?? {}) as SignalVerificationResult;
}

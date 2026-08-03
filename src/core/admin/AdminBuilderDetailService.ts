import { supabase } from "../../lib/supabase";

export interface AdminBuilderDetailProfile {
  username: string | null;
  displayName: string | null;
  level: number;
  gp: number;
  reputation: number;
  referralCount: number;
  inviteCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBuilderDetailIdentity {
  telegram: boolean;
  x: boolean;
  instagram: boolean;
  wallet: boolean;
}

export interface AdminBuilderWalletIntelligence {
  currentGp: number;
  lifetimeCredits: number;
  lifetimeDebits: number;
  lifetimeNet: number;
  socialGp: number;
  miningGp: number;
  missionGp: number;
  referralGp: number;
}

export interface AdminBuilderMiningIntelligence {
  active: boolean;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  claimedSessions: number;
  lifetimeRewardGp: number;
  lastClaimedAt: string | null;
}

export interface AdminBuilderReferralIntelligence {
  parentBuilderId: string | null;
  parentUsername: string | null;
  parentDisplayName: string | null;
  status: string | null;
  createdAt: string | null;
  directReferralCount: number;
}

export interface AdminBuilderRecentLedgerEntry {
  ledgerId: string;
  rewardType: string;
  provider: string | null;
  entryType: "credit" | "debit";
  amount: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminBuilderRecentMiningSession {
  sessionId: string;
  status: "active" | "completed" | "claimed";
  startedAt: string;
  endsAt: string;
  claimedAt: string | null;
  baseRatePerHour: number;
  referralBonusRate: number;
  totalRatePerHour: number;
  activeReferralCount: number;
  rewardGp: number;
  ledgerId: string | null;
}

export interface AdminBuilderDetail {
  builderId: string;
  profile: AdminBuilderDetailProfile;
  identity: AdminBuilderDetailIdentity;
  wallet: AdminBuilderWalletIntelligence;
  mining: AdminBuilderMiningIntelligence;
  referral: AdminBuilderReferralIntelligence;
  recentLedger: AdminBuilderRecentLedgerEntry[];
  recentMining: AdminBuilderRecentMiningSession[];
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLedgerEntry(
  value: AdminBuilderRecentLedgerEntry,
): AdminBuilderRecentLedgerEntry {
  return {
    ...value,
    entryType:
      value.entryType === "debit"
        ? "debit"
        : "credit",
    amount: normalizeNumber(value.amount),
    metadata: value.metadata ?? {},
  };
}

function normalizeMiningSession(
  value: AdminBuilderRecentMiningSession,
): AdminBuilderRecentMiningSession {
  const status =
    value.status === "completed" ||
    value.status === "claimed"
      ? value.status
      : "active";

  return {
    ...value,
    status,
    baseRatePerHour: normalizeNumber(
      value.baseRatePerHour,
    ),
    referralBonusRate: normalizeNumber(
      value.referralBonusRate,
    ),
    totalRatePerHour: normalizeNumber(
      value.totalRatePerHour,
    ),
    activeReferralCount: normalizeNumber(
      value.activeReferralCount,
    ),
    rewardGp: normalizeNumber(value.rewardGp),
  };
}

export const AdminBuilderDetailService = {
  async getBuilderDetail(
    builderId: string,
  ): Promise<AdminBuilderDetail> {
    const normalizedBuilderId = builderId.trim();

    if (!normalizedBuilderId) {
      throw new Error("Builder ID is required.");
    }

    const { data, error } = await supabase.rpc(
      "get_admin_builder_detail",
      {
        p_builder_id: normalizedBuilderId,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Builder Intelligence: ${error.message}`,
      );
    }

    if (!data || typeof data !== "object") {
      throw new Error(
        "Builder Intelligence returned an invalid response.",
      );
    }

    const detail = data as unknown as AdminBuilderDetail;

    return {
      ...detail,

      profile: {
        ...detail.profile,
        level: normalizeNumber(detail.profile.level),
        gp: normalizeNumber(detail.profile.gp),
        reputation: normalizeNumber(
          detail.profile.reputation,
        ),
        referralCount: normalizeNumber(
          detail.profile.referralCount,
        ),
      },

      identity: {
        telegram: Boolean(detail.identity.telegram),
        x: Boolean(detail.identity.x),
        instagram: Boolean(detail.identity.instagram),
        wallet: Boolean(detail.identity.wallet),
      },

      wallet: {
        currentGp: normalizeNumber(
          detail.wallet.currentGp,
        ),
        lifetimeCredits: normalizeNumber(
          detail.wallet.lifetimeCredits,
        ),
        lifetimeDebits: normalizeNumber(
          detail.wallet.lifetimeDebits,
        ),
        lifetimeNet: normalizeNumber(
          detail.wallet.lifetimeNet,
        ),
        socialGp: normalizeNumber(
          detail.wallet.socialGp,
        ),
        miningGp: normalizeNumber(
          detail.wallet.miningGp,
        ),
        missionGp: normalizeNumber(
          detail.wallet.missionGp,
        ),
        referralGp: normalizeNumber(
          detail.wallet.referralGp,
        ),
      },

      mining: {
        active: Boolean(detail.mining.active),
        totalSessions: normalizeNumber(
          detail.mining.totalSessions,
        ),
        activeSessions: normalizeNumber(
          detail.mining.activeSessions,
        ),
        completedSessions: normalizeNumber(
          detail.mining.completedSessions,
        ),
        claimedSessions: normalizeNumber(
          detail.mining.claimedSessions,
        ),
        lifetimeRewardGp: normalizeNumber(
          detail.mining.lifetimeRewardGp,
        ),
        lastClaimedAt:
          detail.mining.lastClaimedAt ?? null,
      },

      referral: {
        ...detail.referral,
        directReferralCount: normalizeNumber(
          detail.referral.directReferralCount,
        ),
      },

      recentLedger: Array.isArray(detail.recentLedger)
        ? detail.recentLedger.map(normalizeLedgerEntry)
        : [],

      recentMining: Array.isArray(detail.recentMining)
        ? detail.recentMining.map(
            normalizeMiningSession,
          )
        : [],
    };
  },
};

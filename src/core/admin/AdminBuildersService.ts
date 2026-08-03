import { supabase } from "../../lib/supabase";

export interface AdminBuilderIdentity {
  telegram: boolean;
  x: boolean;
  instagram: boolean;
  wallet: boolean;
}

export interface AdminBuilder {
  builderId: string;
  username: string | null;
  displayName: string | null;
  level: number;
  gp: number;
  reputation: number;
  referralCount: number;
  inviteCode: string | null;
  createdAt: string;
  miningActive: boolean;
  identity: AdminBuilderIdentity;
  verified: boolean;
  genesisBuilder: boolean;
  passportUnlocked: boolean;
}

export interface AdminBuildersQuery {
  limit?: number;
  offset?: number;
  search?: string;
}

interface AdminBuilderRow {
  builder_id: string;
  username: string | null;
  display_name: string | null;
  level: number | null;
  gp: number | null;
  reputation: number | null;
  referral_count: number | null;
  invite_code: string | null;
  created_at: string;
  mining_active: boolean | null;
  telegram_verified: boolean | null;
  x_verified: boolean | null;
  instagram_verified: boolean | null;
  wallet_verified: boolean | null;
  verified: boolean | null;
  genesis_builder: boolean | null;
  passport_unlocked: boolean | null;
}

function normalizeNonNegativeNumber(
  value: number | null | undefined,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, value);
}

export const AdminBuildersService = {
  async getBuilders(
    query: AdminBuildersQuery = {},
  ): Promise<AdminBuilder[]> {
    const limit = Math.min(
      Math.max(query.limit ?? 25, 1),
      100,
    );

    const offset = Math.max(query.offset ?? 0, 0);
    const search = query.search?.trim() || null;

    const { data, error } = await supabase.rpc(
      "get_admin_builder_intelligence",
      {
        p_limit: limit,
        p_offset: offset,
        p_search: search,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Builder Intelligence: ${error.message}`,
      );
    }

    const rows = (data ?? []) as AdminBuilderRow[];

    return rows.map((row) => ({
      builderId: row.builder_id,
      username: row.username,
      displayName: row.display_name,
      level: normalizeNonNegativeNumber(row.level),
      gp: normalizeNonNegativeNumber(row.gp),
      reputation: normalizeNonNegativeNumber(
        row.reputation,
      ),
      referralCount: normalizeNonNegativeNumber(
        row.referral_count,
      ),
      inviteCode: row.invite_code,
      createdAt: row.created_at,
      miningActive: Boolean(row.mining_active),
      identity: {
        telegram: Boolean(row.telegram_verified),
        x: Boolean(row.x_verified),
        instagram: Boolean(row.instagram_verified),
        wallet: Boolean(row.wallet_verified),
      },
      verified: Boolean(row.verified),
      genesisBuilder: Boolean(row.genesis_builder),
      passportUnlocked: Boolean(
        row.passport_unlocked,
      ),
    }));
  },
};

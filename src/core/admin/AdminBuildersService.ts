import { supabase } from "../../lib/supabase";

export interface AdminBuilderIdentity {
  telegram: boolean;
  x: boolean;
  instagram: boolean;
  wallet: boolean;
}

export type AdminBuilderSignupSource =
  | "DIRECT"
  | "REFERRAL";

export interface AdminBuilder {
  builderId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  level: number;
  gp: number;
  reputation: number;
  referralCount: number;
  inviteCode: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  signupSource: AdminBuilderSignupSource;
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

export interface AdminGrantBuilderGpInput {
  builderId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}

export interface AdminGrantBuilderGpResult {
  awarded: boolean;
  totalGp: number;
  ledgerId: string | null;
}

interface AdminBuilderRow {
  builder_id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  level: number | null;
  gp: number | null;
  reputation: number | null;
  referral_count: number | null;
  invite_code: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  signup_source: string | null;
  mining_active: boolean | null;
  telegram_verified: boolean | null;
  x_verified: boolean | null;
  instagram_verified: boolean | null;
  wallet_verified: boolean | null;
  verified: boolean | null;
  genesis_builder: boolean | null;
  passport_unlocked: boolean | null;
}

interface AdminGrantBuilderGpRow {
  awarded: boolean | null;
  total_gp: number | null;
  ledger_id: string | null;
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
      email: row.email,
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
      lastSignInAt: row.last_sign_in_at,
      signupSource:
        row.signup_source === "REFERRAL"
          ? "REFERRAL"
          : "DIRECT",
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

  async grantGp(
    input: AdminGrantBuilderGpInput,
  ): Promise<AdminGrantBuilderGpResult> {
    const builderId = input.builderId.trim();
    const reason = input.reason.trim();
    const idempotencyKey =
      input.idempotencyKey.trim();

    if (!builderId) {
      throw new Error("Builder ID is required.");
    }

    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0
    ) {
      throw new Error(
        "GP amount must be a positive whole number.",
      );
    }

    if (reason.length < 3 || reason.length > 500) {
      throw new Error(
        "Reason must contain between 3 and 500 characters.",
      );
    }

    if (idempotencyKey.length < 8) {
      throw new Error(
        "A valid operation ID is required.",
      );
    }

    const { data, error } = await supabase.rpc(
      "admin_grant_builder_gp_v1",
      {
        p_builder_id: builderId,
        p_amount: input.amount,
        p_reason: reason,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (error) {
      throw new Error(
        `Unable to grant GP: ${error.message}`,
      );
    }

    const rows =
      (data ?? []) as AdminGrantBuilderGpRow[];
    const row = rows[0];

    if (!row) {
      throw new Error(
        "Grant GP returned an invalid response.",
      );
    }

    return {
      awarded: Boolean(row.awarded),
      totalGp: normalizeNonNegativeNumber(
        row.total_gp,
      ),
      ledgerId: row.ledger_id,
    };
  },
};

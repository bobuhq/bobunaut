import { supabase } from "../../../lib/supabase";

const pendingInviteCodeKey =
  "bobu.pending-builder-invite-code";

const inviteCodePattern = /^BOBU-[A-F0-9]{6}$/;

export interface InviteAttributionResult {
  attributed: boolean;
  referral_status: string | null;
  attributed_referrer_id: string | null;
  reason:
    | "attributed"
    | "already_attributed"
    | "attribution_locked"
    | "invalid_invite_code"
    | "self_referral_not_allowed";
}

const normalizeInviteCode = (
  inviteCode: string,
): string => inviteCode.trim().toUpperCase();

export const savePendingBuilderInviteCode = (
  inviteCode: string,
): boolean => {
  const normalizedCode = normalizeInviteCode(inviteCode);

  if (!inviteCodePattern.test(normalizedCode)) {
    return false;
  }

  sessionStorage.setItem(
    pendingInviteCodeKey,
    normalizedCode,
  );

  return true;
};

export const getPendingBuilderInviteCode = ():
  | string
  | null => sessionStorage.getItem(pendingInviteCodeKey);

export const clearPendingBuilderInviteCode = (): void => {
  sessionStorage.removeItem(pendingInviteCodeKey);
};

export const attributePendingBuilderInvite =
  async (): Promise<InviteAttributionResult | null> => {
    const inviteCode = getPendingBuilderInviteCode();

    if (!inviteCode) {
      return null;
    }

    const { data, error } = await supabase.rpc(
      "attribute_builder_invite",
      {
        p_invite_code: inviteCode,
      },
    );

    if (error) {
      throw error;
    }

    const result = (
      Array.isArray(data) ? data[0] : data
    ) as InviteAttributionResult | null;

    if (result) {
      clearPendingBuilderInviteCode();
    }

    return result;
  };

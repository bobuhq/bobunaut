import { supabase } from "../../lib/supabase";

export type MarsAccess = {
  builder_id: string;
  telegram_verified: boolean;
  x_verified: boolean;
  mining_days: number;
  required_mining_days: number;
  unlocked: boolean;
  unlocked_at: string | null;
  unlock_method: string;
};

export async function getMyMarsAccess(): Promise<MarsAccess> {
  const { data, error } = await supabase.rpc(
    "get_my_ares_access_protocol",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsAccess[] | null;
  const access = rows?.[0];

  if (!access) {
    throw new Error(
      "ARES Access Protocol returned no result.",
    );
  }

  return access;
}

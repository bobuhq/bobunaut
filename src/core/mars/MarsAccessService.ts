import { supabase } from "../../lib/supabase";

export type MarsAccess = {
  builder_id: string;
  current_gp: number;
  required_gp: number;
  remaining_gp: number;
  unlocked: boolean;
  unlocked_at: string | null;
  unlock_gp: number | null;
};

export async function getMyMarsAccess(): Promise<MarsAccess> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_access",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsAccess[] | null;
  const access = rows?.[0];

  if (!access) {
    throw new Error(
      "BUILD MARS access state returned no result.",
    );
  }

  return access;
}

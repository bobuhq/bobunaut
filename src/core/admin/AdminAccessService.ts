import { supabase } from "../../lib/supabase";

export type AdminRole =
  | "owner"
  | "admin"
  | "support"
  | "analyst";

export interface AdminAccess {
  userId: string;
  role: AdminRole;
  active: boolean;
}

interface AdminAccessRow {
  user_id: string;
  role: AdminRole;
  active: boolean;
}

export const AdminAccessService = {
  async getMyAccess(): Promise<AdminAccess | null> {
    const { data, error } = await supabase.rpc(
      "get_my_admin_access",
    );

    if (error) {
      throw new Error(
        `Unable to verify admin access: ${error.message}`,
      );
    }

    const rows = (data ?? []) as AdminAccessRow[];
    const access = rows[0];

    if (!access) {
      return null;
    }

    return {
      userId: access.user_id,
      role: access.role,
      active: access.active,
    };
  },
};

import { supabase } from "../../../lib/supabase";

export type GalaxyReferralStatus =
  | "pending"
  | "active";

export interface GalaxyMember {
  builderId: string;
  username: string | null;
  displayName: string | null;
  level: number;
  gp: number;
  referralCount: number;
  referralStatus: GalaxyReferralStatus;
  joinedAt: string;
}

interface GalaxyMemberRow {
  builder_id: string;
  username: string | null;
  display_name: string | null;
  level: number;
  gp: number;
  referral_count: number;
  referral_status: GalaxyReferralStatus;
  joined_at: string;
}

export const galaxyService = {
  async loadMyGalaxy(): Promise<GalaxyMember[]> {
    const { data, error } = await supabase
      .rpc("get_my_galaxy")
      .returns<GalaxyMemberRow[]>();

    if (error) {
      throw error;
    }

    const rows: GalaxyMemberRow[] = Array.isArray(data)
      ? (data as GalaxyMemberRow[])
      : [];

    return rows.map((member) => ({
      builderId: member.builder_id,
      username: member.username,
      displayName: member.display_name,
      level: member.level,
      gp: member.gp,
      referralCount: member.referral_count,
      referralStatus: member.referral_status,
      joinedAt: member.joined_at,
    }));
  },
};

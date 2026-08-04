import { supabase } from "../../../lib/supabase";

export type GalaxyReferralStatus =
  | "pending"
  | "active";

export interface GalaxyMember {
  builderId: string;
  parentBuilderId: string;
  username: string | null;
  displayName: string | null;
  level: number;
  gp: number;
  referralCount: number;
  referralStatus: GalaxyReferralStatus;
  joinedAt: string;
  depth: number;
}

interface GalaxyMemberRow {
  builder_id: string;
  parent_builder_id: string;
  username: string | null;
  display_name: string | null;
  level: number;
  gp: number;
  referral_count: number;
  referral_status: GalaxyReferralStatus;
  joined_at: string;
  depth: number;
}

export interface GalaxyMiningMember {
  builderId: string;
  referralStatus: GalaxyReferralStatus;
  isMiningActive: boolean;
  contributionGp: number;
}

interface GalaxyMiningMemberRow {
  builder_id: string;
  referral_status: GalaxyReferralStatus;
  is_mining_active: boolean | null;
  contribution_gp: number | string | null;
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
      parentBuilderId: member.parent_builder_id,
      username: member.username,
      displayName: member.display_name,
      level: member.level,
      gp: member.gp,
      referralCount: member.referral_count,
      referralStatus: member.referral_status,
      joinedAt: member.joined_at,
      depth: member.depth,
    }));
  },

  async loadMyMiningTeam(): Promise<
    GalaxyMiningMember[]
  > {
    const { data, error } = await supabase
      .rpc("get_my_mining_team")
      .returns<GalaxyMiningMemberRow[]>();

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data)
      ? data
      : [];

    return rows.map((row) => {
      const contributionGp = Number(
        row.contribution_gp ?? 0,
      );

      return {
        builderId: row.builder_id,
        referralStatus: row.referral_status,
        isMiningActive:
          row.is_mining_active === true,
        contributionGp:
          Number.isFinite(contributionGp) &&
          contributionGp >= 0
            ? contributionGp
            : 0,
      };
    });
  },

  async loadMyInviter(): Promise<GalaxyMember | null> {
    const { data, error } = await supabase
      .rpc("get_my_inviter")
      .returns<GalaxyMemberRow[]>();

    if (error) {
      throw error;
    }

    const row = Array.isArray(data)
      ? data[0]
      : null;

    if (!row) {
      return null;
    }

    return {
      builderId: row.builder_id,
      parentBuilderId: row.parent_builder_id,
      username: row.username,
      displayName: row.display_name,
      level: row.level,
      gp: row.gp,
      referralCount: row.referral_count,
      referralStatus: row.referral_status,
      joinedAt: row.joined_at,
      depth: row.depth,
    };
  },
};

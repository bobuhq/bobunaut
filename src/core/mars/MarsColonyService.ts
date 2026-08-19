import { supabase } from "../../lib/supabase";

export type MarsColony = {
  colony_id: string;
  colony_code: string;
  colony_name: string;
  specialization: string;
  colony_status: string;
  member_count: number;
  total_contribution: number;

  my_role: string;
  membership_status: string;
  joined_at: string | null;

  founder_builder_id: string;
  leader_builder_id: string;

  active_sector_id: string | null;
  active_sector_code: string | null;
  active_sector_name: string | null;
  active_sector_status: string | null;
  sector_assigned_at: string | null;

  created_at: string;
};

export type CreatedMarsColony = {
  colony_id: string;
  colony_code: string;
  colony_name: string;
  specialization: string;
  colony_status: string;
  member_count: number;
  created_at: string;
};

export async function getMyMarsColony(): Promise<MarsColony | null> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_v2",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsColony[] | null;

  return rows?.[0] ?? null;
}

export async function createMyMarsColony(
  name: string,
  specialization: string = "general",
): Promise<CreatedMarsColony> {
  const { data, error } = await supabase.rpc(
    "create_my_mars_colony",
    {
      p_name: name,
      p_specialization: specialization,
    },
  );

  if (error) {
    throw error;
  }

  const rows = data as CreatedMarsColony[] | null;
  const colony = rows?.[0];

  if (!colony) {
    throw new Error("Mars Colony creation returned no result.");
  }

  return colony;
}

import { supabase } from "../../lib/supabase";

export type MarsSector = {
  sector_id: string;
  sector_code: string;
  sector_name: string;
  sector_status: string;
  max_colonies: number;
  current_colonies: number;
  total_contribution: number;
  map_x: number | null;
  map_y: number | null;
};

export type MarsSectorAssignment = {
  assignment_id: string;
  colony_id: string;
  colony_name: string;
  sector_id: string;
  sector_name: string;
  assignment_status: string;
  assigned_at: string;
  sector_current_colonies: number;
};

export async function getMarsSectorDirectory(): Promise<MarsSector[]> {
  const { data, error } = await supabase.rpc(
    "get_mars_sector_directory",
  );

  if (error) {
    throw error;
  }

  return (data as MarsSector[] | null) ?? [];
}

export async function assignMyColonyToMarsSector(
  sectorId: string,
): Promise<MarsSectorAssignment> {
  const { data, error } = await supabase.rpc(
    "assign_my_colony_to_mars_sector",
    {
      p_sector_id: sectorId,
    },
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsSectorAssignment[] | null;
  const assignment = rows?.[0];

  if (!assignment) {
    throw new Error(
      "Mars Sector assignment returned no result.",
    );
  }

  return assignment;
}

import { supabase } from "../../lib/supabase";

export type MarsColonyBaseBuilding = {
  colony_id: string;
  colony_name: string;

  building_key: string;
  building_name: string;
  building_category: string;
  building_description: string;

  built: boolean;
  building_level: number;
  building_status: string;

  max_level: number;
  constructed_at: string | null;
};

export type MarsColonyBuildingConstruction = {
  building_id: string;
  colony_id: string;
  colony_name: string;
  building_key: string;
  building_name: string;
  building_level: number;
  building_status: string;
  constructed_at: string;
};

function firstRpcRow<T>(
  data: unknown,
  message: string,
): T {
  const rows = data as T[] | null;
  const result = rows?.[0];

  if (!result) {
    throw new Error(message);
  }

  return result;
}

export async function getMyMarsColonyBase():
Promise<MarsColonyBaseBuilding[]> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_base",
  );

  if (error) {
    throw error;
  }

  return (data as MarsColonyBaseBuilding[] | null) ?? [];
}

export async function constructMyMarsColonyBuilding(
  buildingKey: string,
): Promise<MarsColonyBuildingConstruction> {
  const { data, error } = await supabase.rpc(
    "construct_my_mars_colony_building",
    {
      p_building_key: buildingKey,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyBuildingConstruction>(
    data,
    "Mars Colony building construction returned no result.",
  );
}

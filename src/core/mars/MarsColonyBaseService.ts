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

export type MarsColonyResources = {
  colony_id: string;
  colony_name: string;
  materials: number;
  energy: number;
  water: number;
  science: number;
  food: number;
  updated_at: string;
};

export type MarsColonyBuildingUpgrade = {
  building_key: string;
  building_name: string;
  current_level: number;
  max_level: number;
  can_upgrade: boolean;
  next_level: number | null;
  materials_cost: number;
  energy_cost: number;
  water_cost: number;
  science_cost: number;
  food_cost: number;
};

export type MarsColonyBuildingUpgradeResult = {
  building_id: string;
  colony_id: string;
  colony_name: string;
  building_key: string;
  building_name: string;
  previous_level: number;
  new_level: number;
  materials_remaining: number;
  energy_remaining: number;
  water_remaining: number;
  science_remaining: number;
  food_remaining: number;
  upgraded_at: string;
};


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

export async function getMyMarsColonyResources():
Promise<MarsColonyResources | null> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_resources",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsColonyResources[] | null;
  return rows?.[0] ?? null;
}

export async function getMyMarsColonyBuildingUpgrades():
Promise<MarsColonyBuildingUpgrade[]> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_building_upgrades",
  );

  if (error) {
    throw error;
  }

  return (data as MarsColonyBuildingUpgrade[] | null) ?? [];
}

export async function upgradeMyMarsColonyBuilding(
  buildingKey: string,
): Promise<MarsColonyBuildingUpgradeResult> {
  const { data, error } = await supabase.rpc(
    "upgrade_my_mars_colony_building",
    {
      p_building_key: buildingKey,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyBuildingUpgradeResult>(
    data,
    "Mars Colony building upgrade returned no result.",
  );
}


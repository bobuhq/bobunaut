import { supabase } from "../../lib/supabase";

export type MarsColonyRotation =
  | 0
  | 90
  | 180
  | 270;

export type MarsColonyBaseBuilding = {
  colony_id: string;
  colony_name: string;

  /*
   * Physical Colony building instance identity.
   *
   * NULL means this row is only a not-yet-built catalog
   * definition returned by get_my_mars_colony_base().
   */
  building_id: string | null;

  building_key: string;
  building_name: string;
  building_category: string;
  building_description: string;

  built: boolean;
  building_level: number;
  building_status: string;

  max_level: number;
  constructed_at: string | null;

  grid_x: number | null;
  grid_z: number | null;
  rotation_y: MarsColonyRotation;

  footprint_width: number;
  footprint_depth: number;
};

export type MarsColonyBuildingPlacement = {
  building_id: string;
  building_key: string;
  grid_x: number;
  grid_z: number;
  rotation_y: MarsColonyRotation;
  footprint_width: number;
  footprint_depth: number;
  updated_at: string;
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


export type MarsColonyBuildingConstructionCost = {
  building_key: string;
  building_name: string;
  materials_cost: number;
  energy_cost: number;
  water_cost: number;
  science_cost: number;
  food_cost: number;
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


export type MarsColonyResourceProduction = {
  colony_id: string;
  colony_name: string;
  last_claim_at: string;
  accrued_seconds: number;
  max_accrual_seconds: number;

  materials_per_hour: number;
  energy_per_hour: number;
  water_per_hour: number;
  science_per_hour: number;
  food_per_hour: number;

  claimable_materials: number;
  claimable_energy: number;
  claimable_water: number;
  claimable_science: number;
  claimable_food: number;
};

export type MarsColonyResourceClaim = {
  claim_id: string;
  colony_id: string;
  colony_name: string;
  elapsed_seconds: number;

  materials_claimed: number;
  energy_claimed: number;
  water_claimed: number;
  science_claimed: number;
  food_claimed: number;

  materials_balance: number;
  energy_balance: number;
  water_balance: number;
  science_balance: number;
  food_balance: number;

  claimed_at: string;
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

export async function moveMyMarsColonyBuilding(
  buildingId: string,
  gridX: number,
  gridZ: number,
  rotationY: MarsColonyRotation = 0,
): Promise<MarsColonyBuildingPlacement> {
  const { data, error } = await supabase.rpc(
    "move_my_mars_colony_building",
    {
      p_building_id: buildingId,
      p_grid_x: gridX,
      p_grid_z: gridZ,
      p_rotation_y: rotationY,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyBuildingPlacement>(
    data,
    "Mars colony building placement was not returned.",
  );
}


export async function getMyMarsColonyConstructionCosts():
Promise<MarsColonyBuildingConstructionCost[]> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_construction_costs",
  );

  if (error) {
    throw error;
  }

  return (
    (data as MarsColonyBuildingConstructionCost[] | null) ?? []
  );
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

export async function getMyMarsResourceProduction():
Promise<MarsColonyResourceProduction | null> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_resource_production",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsColonyResourceProduction[] | null;
  return rows?.[0] ?? null;
}

export async function claimMyMarsColonyResources():
Promise<MarsColonyResourceClaim> {
  const { data, error } = await supabase.rpc(
    "claim_my_mars_colony_resources",
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyResourceClaim>(
    data,
    "Mars Colony resource claim returned no result.",
  );
}

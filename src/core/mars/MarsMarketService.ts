import { supabase } from "../../lib/supabase";

export type MarsMarketItem = {
  item_key: string;
  name: string;
  category: string;
  description: string;
  item_type: string;
  building_key: string | null;

  materials_cost: number;
  energy_cost: number;
  water_cost: number;
  science_cost: number;
  food_cost: number;

  owned_quantity: number;
  already_constructed: boolean;
};

export type MarsInventoryItem = {
  inventory_id: string;
  item_key: string;
  item_name: string;
  item_type: string;
  building_key: string | null;
  quantity: number;
  purchased_at: string;
};

export type MarsMarketPurchaseResult = {
  item_key: string;
  item_name: string;
  quantity: number;

  materials_remaining: number;
  energy_remaining: number;
  water_remaining: number;
  science_remaining: number;
  food_remaining: number;
};

function throwRpcError(
  operation: string,
  error: { message?: string } | null,
): never {
  throw new Error(
    error?.message
      ? `${operation}: ${error.message}`
      : `${operation} failed.`,
  );
}

export async function getMyMarsMarket():
Promise<MarsMarketItem[]> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_market",
  );

  if (error) {
    throwRpcError(
      "Unable to load Mars Market",
      error,
    );
  }

  return (data ?? []) as MarsMarketItem[];
}

export async function getMyMarsInventory():
Promise<MarsInventoryItem[]> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_inventory",
  );

  if (error) {
    throwRpcError(
      "Unable to load Mars Inventory",
      error,
    );
  }

  return (data ?? []) as MarsInventoryItem[];
}

export async function buyMyMarsMarketItem(
  itemKey: string,
): Promise<MarsMarketPurchaseResult> {
  const { data, error } = await supabase.rpc(
    "buy_my_mars_market_item",
    {
      p_item_key: itemKey,
    },
  );

  if (error) {
    throwRpcError(
      "Mars Market purchase failed",
      error,
    );
  }

  const row = Array.isArray(data)
    ? data[0]
    : data;

  if (!row) {
    throw new Error(
      "Mars Market purchase returned no result.",
    );
  }

  return row as MarsMarketPurchaseResult;
}

// ============================================================
// INVENTORY -> 3D COLONY PLACEMENT
// ============================================================

export type MarsInventoryBuildingPlacementResult = {
  building_id: string;
  colony_id: string;

  building_key: string;
  building_name: string;

  building_level: number;
  building_status: string;

  grid_x: number;
  grid_z: number;

  rotation_y: 0 | 90 | 180 | 270;

  footprint_width: number;
  footprint_depth: number;

  inventory_quantity: number;

  placed_at: string;
};

export async function placeMyMarsInventoryBuilding(
  itemKey: string,
  gridX: number,
  gridZ: number,
  rotationY: 0 | 90 | 180 | 270 = 0,
): Promise<MarsInventoryBuildingPlacementResult> {
  const { data, error } = await supabase.rpc(
    "place_my_mars_inventory_building",
    {
      p_item_key: itemKey,
      p_grid_x: gridX,
      p_grid_z: gridZ,
      p_rotation_y: rotationY,
    },
  );

  if (error) {
    throw error;
  }

  const rows =
    data as
      | MarsInventoryBuildingPlacementResult[]
      | null;

  const result = rows?.[0];

  if (!result) {
    throw new Error(
      "Mars inventory building placement returned no result.",
    );
  }

  return result;
}

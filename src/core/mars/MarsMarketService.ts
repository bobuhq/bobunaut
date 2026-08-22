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

import { supabase } from "../../lib/supabase";

export type MarsCommandHubProgression = {
  command_hub_level: number;
  map_min: number;
  map_max: number;
  max_other_building_level: number;
  market_tier: number;
};

function firstRpcRow<T>(
  data: unknown,
): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }

  return (data as T | null) ?? null;
}

export async function getMarsCommandHubProgressionForColony(
  colonyId: string,
): Promise<MarsCommandHubProgression> {
  if (!colonyId) {
    throw new Error(
      "Mars colony ID is required for Command Hub progression.",
    );
  }

  const { data, error } = await supabase.rpc(
    "get_mars_command_hub_progression_for_colony",
    {
      p_colony_id: colonyId,
    },
  );

  if (error) {
    throw error;
  }

  const progression =
    firstRpcRow<MarsCommandHubProgression>(
      data,
    );

  if (!progression) {
    throw new Error(
      "Mars Command Hub progression was not returned.",
    );
  }

  return progression;
}

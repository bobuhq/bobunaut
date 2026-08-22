import { supabase } from "../../../../lib/supabase";

import type {
  MarsColonySimulationSnapshot,
} from "../types/MarsColonySimulationSnapshot";

export async function getMyMarsSimulationSnapshot():
Promise<MarsColonySimulationSnapshot> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_mars_simulation_snapshot",
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Mars simulation snapshot was not returned.",
    );
  }

  return data as
    MarsColonySimulationSnapshot;
}

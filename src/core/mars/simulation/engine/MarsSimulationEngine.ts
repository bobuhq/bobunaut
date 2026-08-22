import type {
  MarsBuildingRuntimeState,
} from "../types/MarsBuildingRuntimeState";

import type {
  MarsColonySimulationSnapshot,
} from "../types/MarsColonySimulationSnapshot";

import type {
  MarsResourceState,
} from "../types/MarsResourceState";

import {
  calculateMarsResourceFlows,
} from "./MarsResourceEngine";

export function createMarsSimulationSnapshot(
  colonyId: string,
  resources: MarsResourceState,
  buildings: MarsBuildingRuntimeState[],
  simulatedAt: string,
): MarsColonySimulationSnapshot {
  return {
    colonyId,
    resources,
    buildings,
    production:
      calculateMarsResourceFlows(
        buildings,
      ),
    simulatedAt,
  };
}

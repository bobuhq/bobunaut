import type {
  MarsBuildingRuntimeState,
} from "./MarsBuildingRuntimeState";

import type {
  MarsProductionFlow,
} from "./MarsProductionFlow";

import type {
  MarsResourceState,
} from "./MarsResourceState";

export type MarsColonySimulationSnapshot = {
  colonyId: string;

  resources: MarsResourceState;

  buildings:
    MarsBuildingRuntimeState[];

  production:
    MarsProductionFlow[];

  simulatedAt: string;
};

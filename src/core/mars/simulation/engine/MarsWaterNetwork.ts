import type {
  MarsBuildingRuntimeState,
} from "../types/MarsBuildingRuntimeState";

export type MarsWaterNetworkState = {
  productionPerHour: number;
  consumptionPerHour: number;
  netPerHour: number;
  sufficient: boolean;
};

export function calculateMarsWaterNetwork(
  buildings: MarsBuildingRuntimeState[],
): MarsWaterNetworkState {
  let productionPerHour = 0;
  let consumptionPerHour = 0;

  for (const building of buildings) {
    if (
      building.operationalStatus !==
      "active"
    ) {
      continue;
    }

    const efficiency =
      Math.max(
        0,
        building.efficiency,
      );

    productionPerHour +=
      building.waterProductionPerHour *
      efficiency;

    consumptionPerHour +=
      building.waterConsumptionPerHour *
      efficiency;
  }

  const netPerHour =
    productionPerHour -
    consumptionPerHour;

  return {
    productionPerHour,
    consumptionPerHour,
    netPerHour,
    sufficient:
      netPerHour >= 0,
  };
}

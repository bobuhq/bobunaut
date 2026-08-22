import type {
  MarsBuildingRuntimeState,
} from "../types/MarsBuildingRuntimeState";

export type MarsEnergyNetworkState = {
  productionPerHour: number;
  consumptionPerHour: number;
  netPerHour: number;
  sufficient: boolean;
};

export function calculateMarsEnergyNetwork(
  buildings: MarsBuildingRuntimeState[],
): MarsEnergyNetworkState {
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
      building.energyProductionPerHour *
      efficiency;

    consumptionPerHour +=
      building.energyConsumptionPerHour *
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

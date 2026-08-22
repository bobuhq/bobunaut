import type {
  MarsBuildingRuntimeState,
} from "../types/MarsBuildingRuntimeState";

import type {
  MarsProductionFlow,
} from "../types/MarsProductionFlow";

export function calculateMarsResourceFlows(
  buildings: MarsBuildingRuntimeState[],
): MarsProductionFlow[] {
  let energyProduced = 0;
  let energyConsumed = 0;

  let waterProduced = 0;
  let waterConsumed = 0;

  let scienceProduced = 0;

  let foodProduced = 0;
  let foodConsumed = 0;

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

    energyProduced +=
      building.energyProductionPerHour *
      efficiency;

    energyConsumed +=
      building.energyConsumptionPerHour *
      efficiency;

    waterProduced +=
      building.waterProductionPerHour *
      efficiency;

    waterConsumed +=
      building.waterConsumptionPerHour *
      efficiency;

    scienceProduced +=
      building.scienceProductionPerHour *
      efficiency;

    foodProduced +=
      building.foodProductionPerHour *
      efficiency;

    foodConsumed +=
      building.foodConsumptionPerHour *
      efficiency;
  }

  return [
    {
      resource: "energy",
      producedPerHour:
        energyProduced,
      consumedPerHour:
        energyConsumed,
      netPerHour:
        energyProduced -
        energyConsumed,
    },
    {
      resource: "water",
      producedPerHour:
        waterProduced,
      consumedPerHour:
        waterConsumed,
      netPerHour:
        waterProduced -
        waterConsumed,
    },
    {
      resource: "science",
      producedPerHour:
        scienceProduced,
      consumedPerHour: 0,
      netPerHour:
        scienceProduced,
    },
    {
      resource: "food",
      producedPerHour:
        foodProduced,
      consumedPerHour:
        foodConsumed,
      netPerHour:
        foodProduced -
        foodConsumed,
    },
  ];
}

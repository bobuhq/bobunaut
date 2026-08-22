import type {
  MarsBuildingRuntimeState,
} from "../types/MarsBuildingRuntimeState";

export function calculateMarsEffectiveOutput(
  building: MarsBuildingRuntimeState,
  baseOutputPerHour: number,
): number {
  if (
    building.operationalStatus !==
    "active"
  ) {
    return 0;
  }

  const workerRatio =
    building.workersRequired <= 0
      ? 1
      : Math.min(
          1,
          building.workersAssigned /
            building.workersRequired,
        );

  const conditionRatio =
    Math.max(
      0,
      Math.min(
        1,
        building.condition,
      ),
    );

  const efficiency =
    Math.max(
      0,
      building.efficiency,
    );

  return (
    baseOutputPerHour *
    workerRatio *
    conditionRatio *
    efficiency
  );
}

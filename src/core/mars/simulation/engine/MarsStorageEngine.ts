import type {
  MarsBuildingRuntimeState,
} from "../types/MarsBuildingRuntimeState";

export type MarsStorageState = {
  totalCapacity: number;
  totalUsed: number;
  availableCapacity: number;
};

export function calculateMarsStorageState(
  buildings: MarsBuildingRuntimeState[],
): MarsStorageState {
  let totalCapacity = 0;
  let totalUsed = 0;

  for (const building of buildings) {
    if (
      building.operationalStatus ===
      "archived"
    ) {
      continue;
    }

    totalCapacity +=
      Math.max(
        0,
        building.storageCapacity,
      );

    totalUsed +=
      Math.max(
        0,
        building.storageUsed,
      );
  }

  return {
    totalCapacity,
    totalUsed,
    availableCapacity:
      Math.max(
        0,
        totalCapacity -
        totalUsed,
      ),
  };
}

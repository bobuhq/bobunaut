import type {
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

import type {
  MarsBuildingInstance,
} from "../types/MarsBuildingInstance";

import {
  getRotatedFootprint,
} from "./MarsCoordinateSystem";

import {
  createMarsOccupancyMap,
  marsGridCellKey,
} from "./MarsGridEngine";

export type MarsCollisionCheck = {
  occupied: boolean;

  blockingBuildingIds: string[];
};

export function checkMarsPlacementCollision({
  buildings,
  buildingId,
  gridX,
  gridZ,
  rotationY,
  footprintWidth,
  footprintDepth,
}: {
  buildings: MarsBuildingInstance[];

  buildingId?: string | null;

  gridX: number;
  gridZ: number;

  rotationY: MarsColonyRotation;

  footprintWidth: number;
  footprintDepth: number;
}): MarsCollisionCheck {
  const footprint =
    getRotatedFootprint(
      footprintWidth,
      footprintDepth,
      rotationY,
    );

  const occupancy =
    createMarsOccupancyMap(
      buildings,
      buildingId,
    );

  const blockers =
    new Set<string>();

  for (
    let x = gridX;
    x < gridX + footprint.width;
    x += 1
  ) {
    for (
      let z = gridZ;
      z < gridZ + footprint.depth;
      z += 1
    ) {
      const occupiedBy =
        occupancy.get(
          marsGridCellKey(x, z),
        );

      if (occupiedBy) {
        blockers.add(occupiedBy);
      }
    }
  }

  return {
    occupied:
      blockers.size > 0,

    blockingBuildingIds:
      Array.from(blockers),
  };
}

import type {
  MarsBuildingInstance,
  MarsGridCell,
} from "../types/MarsBuildingInstance";

import {
  getRotatedFootprint,
} from "./MarsCoordinateSystem";

export function getBuildingOccupiedCells(
  building: MarsBuildingInstance,
): MarsGridCell[] {
  const footprint =
    getRotatedFootprint(
      building.footprintWidth,
      building.footprintDepth,
      building.rotationY,
    );

  const cells: MarsGridCell[] = [];

  for (
    let x = building.gridX;
    x <
    building.gridX +
      footprint.width;
    x += 1
  ) {
    for (
      let z = building.gridZ;
      z <
      building.gridZ +
        footprint.depth;
      z += 1
    ) {
      cells.push({
        x,
        z,
      });
    }
  }

  return cells;
}

export function marsGridCellKey(
  x: number,
  z: number,
): string {
  return `${x}:${z}`;
}

export function createMarsOccupancyMap(
  buildings: MarsBuildingInstance[],
  excludeBuildingId?: string | null,
): Map<string, string> {
  const occupancy =
    new Map<string, string>();

  for (const building of buildings) {
    if (
      excludeBuildingId &&
      building.buildingId ===
        excludeBuildingId
    ) {
      continue;
    }

    if (
      building.status ===
      "archived"
    ) {
      continue;
    }

    const cells =
      getBuildingOccupiedCells(
        building,
      );

    for (const cell of cells) {
      occupancy.set(
        marsGridCellKey(
          cell.x,
          cell.z,
        ),
        building.buildingId,
      );
    }
  }

  return occupancy;
}

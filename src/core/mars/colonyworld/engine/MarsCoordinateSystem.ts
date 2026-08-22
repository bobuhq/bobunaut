import * as THREE from "three";

import type {
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

import type {
  MarsBuildingFootprint,
} from "../types/MarsBuildingInstance";

export const MARS_GRID_UNIT = 1.35;

export const MARS_GRID_MIN = -12;
export const MARS_GRID_MAX = 12;

export function getRotatedFootprint(
  footprintWidth: number,
  footprintDepth: number,
  rotationY: MarsColonyRotation,
): MarsBuildingFootprint {
  const width = Math.max(
    footprintWidth,
    1,
  );

  const depth = Math.max(
    footprintDepth,
    1,
  );

  if (
    rotationY === 90 ||
    rotationY === 270
  ) {
    return {
      width: depth,
      depth: width,
    };
  }

  return {
    width,
    depth,
  };
}

export function clampMarsGridCoordinate(
  value: number,
  footprintSize: number,
): number {
  return THREE.MathUtils.clamp(
    value,
    MARS_GRID_MIN,
    MARS_GRID_MAX -
      footprintSize +
      1,
  );
}

export function marsGridToWorld(
  gridX: number,
  gridZ: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  return {
    x:
      (
        gridX +
        (footprintWidth - 1) / 2
      ) *
      MARS_GRID_UNIT,

    z:
      (
        gridZ +
        (footprintDepth - 1) / 2
      ) *
      MARS_GRID_UNIT,
  };
}

export function marsWorldToGrid(
  worldX: number,
  worldZ: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  const rawX =
    Math.round(
      worldX /
        MARS_GRID_UNIT -
        (footprintWidth - 1) / 2,
    );

  const rawZ =
    Math.round(
      worldZ /
        MARS_GRID_UNIT -
        (footprintDepth - 1) / 2,
    );

  return {
    gridX:
      clampMarsGridCoordinate(
        rawX,
        footprintWidth,
      ),

    gridZ:
      clampMarsGridCoordinate(
        rawZ,
        footprintDepth,
      ),
  };
}

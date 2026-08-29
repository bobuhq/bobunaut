import type {
  MarsBuildingInstance,
} from "../types/MarsBuildingInstance";

import type {
  MarsPlacementDraft,
  MarsPlacementValidationCode,
  MarsPlacementValidationResult,
} from "../types/MarsPlacementState";

import {
  getRotatedFootprint,
  MARS_GRID_MAX,
  MARS_GRID_MIN,
} from "./MarsCoordinateSystem";

import {
  checkMarsPlacementCollision,
} from "./MarsCollisionEngine";

export type MarsPlacementBounds = {
  min: number;
  max: number;
};

export function validateMarsPlacement(
  draft: MarsPlacementDraft,
  buildings: MarsBuildingInstance[],
  bounds: MarsPlacementBounds = {
    min: MARS_GRID_MIN,
    max: MARS_GRID_MAX,
  },
): MarsPlacementValidationResult {
  const codes:
    MarsPlacementValidationCode[] =
      [];

  const footprint =
    getRotatedFootprint(
      draft.footprintWidth,
      draft.footprintDepth,
      draft.rotationY,
    );

  if (
    footprint.width <= 0 ||
    footprint.depth <= 0
  ) {
    codes.push(
      "INVALID_FOOTPRINT",
    );
  }

  const maxX =
    draft.gridX +
    footprint.width -
    1;

  const maxZ =
    draft.gridZ +
    footprint.depth -
    1;

  if (
    draft.gridX < bounds.min ||
    draft.gridZ < bounds.min ||
    maxX > bounds.max ||
    maxZ > bounds.max
  ) {
    codes.push(
      "OUT_OF_BOUNDS",
    );
  }

  const collision =
    checkMarsPlacementCollision({
      buildings,

      buildingId:
        draft.buildingId,

      gridX:
        draft.gridX,

      gridZ:
        draft.gridZ,

      rotationY:
        draft.rotationY,

      footprintWidth:
        draft.footprintWidth,

      footprintDepth:
        draft.footprintDepth,
    });

  if (collision.occupied) {
    codes.push("OCCUPIED");
  }

  if (codes.length === 0) {
    codes.push("VALID");
  }

  return {
    valid:
      codes.length === 1 &&
      codes[0] === "VALID",

    codes,
  };
}

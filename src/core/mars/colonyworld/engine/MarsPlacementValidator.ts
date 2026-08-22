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

export function validateMarsPlacement(
  draft: MarsPlacementDraft,
  buildings: MarsBuildingInstance[],
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
    draft.gridX < MARS_GRID_MIN ||
    draft.gridZ < MARS_GRID_MIN ||
    maxX > MARS_GRID_MAX ||
    maxZ > MARS_GRID_MAX
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

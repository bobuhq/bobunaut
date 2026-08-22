import type {
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

import type {
  MarsPlacementDraft,
  MarsPlacementState,
} from "../types/MarsPlacementState";

export function createIdleMarsPlacementState():
MarsPlacementState {
  return {
    mode: "idle",

    selectedBuildingId: null,

    draft: null,

    validation: {
      valid: false,
      codes: [],
    },
  };
}

export function createMarsPlacementDraft({
  buildingId,
  buildingKey,
  gridX,
  gridZ,
  rotationY,
  footprintWidth,
  footprintDepth,
}: {
  buildingId: string | null;

  buildingKey: string;

  gridX: number;
  gridZ: number;

  rotationY: MarsColonyRotation;

  footprintWidth: number;
  footprintDepth: number;
}): MarsPlacementDraft {
  return {
    buildingId,
    buildingKey,

    gridX,
    gridZ,

    rotationY,

    footprintWidth,
    footprintDepth,
  };
}

export function rotateMarsPlacement(
  draft: MarsPlacementDraft,
): MarsPlacementDraft {
  return {
    ...draft,

    rotationY:
      (
        (draft.rotationY + 90) %
        360
      ) as MarsColonyRotation,
  };
}

export function moveMarsPlacement(
  draft: MarsPlacementDraft,
  gridX: number,
  gridZ: number,
): MarsPlacementDraft {
  return {
    ...draft,
    gridX,
    gridZ,
  };
}

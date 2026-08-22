import type {
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

export type MarsPlacementMode =
  | "idle"
  | "selected"
  | "placing"
  | "moving"
  | "saving";

export type MarsPlacementValidationCode =
  | "VALID"
  | "OUT_OF_BOUNDS"
  | "OCCUPIED"
  | "INVALID_FOOTPRINT";

export type MarsPlacementValidationResult = {
  valid: boolean;

  codes: MarsPlacementValidationCode[];
};

export type MarsPlacementDraft = {
  buildingId: string | null;
  buildingKey: string;

  gridX: number;
  gridZ: number;

  rotationY: MarsColonyRotation;

  footprintWidth: number;
  footprintDepth: number;
};

export type MarsPlacementState = {
  mode: MarsPlacementMode;

  selectedBuildingId: string | null;

  draft: MarsPlacementDraft | null;

  validation: MarsPlacementValidationResult;
};

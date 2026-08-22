import type {
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

/**
 * One physical building inside a Mars Colony.
 *
 * buildingId:
 *   Persistent physical instance identity.
 *
 * buildingKey:
 *   Building definition / type identity.
 *
 * IMPORTANT:
 * Multiple physical buildings may share the same buildingKey.
 * They must never share the same buildingId.
 */
export type MarsBuildingInstance = {
  buildingId: string;
  buildingKey: string;
  colonyId: string;

  gridX: number;
  gridZ: number;

  rotationY: MarsColonyRotation;

  footprintWidth: number;
  footprintDepth: number;

  level: number;
  status: string;
};

export type MarsBuildingFootprint = {
  width: number;
  depth: number;
};

export type MarsGridCell = {
  x: number;
  z: number;
};

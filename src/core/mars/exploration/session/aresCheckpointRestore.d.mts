import type { AresPoint } from "./aresCheckpoint.mjs";

export type AresRestoreObstacle = {
  kind?: "circle";
  x: number;
  z: number;
  radius: number;
} | {
  kind: "box";
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
};

export type AresRestoreGeometry = {
  ready: boolean;
  authorized: boolean;
  boundary: number;
  obstacles: readonly AresRestoreObstacle[];
  sampleGround: (x: number, z: number) => number;
};

export type AresRestoredPosition = {
  position: AresPoint;
  yaw: number;
  cameraYaw: number;
  cameraPitch: number;
};

export function validateAresRestorePosition(
  value: unknown,
  owner: string,
  geometry: AresRestoreGeometry
): AresRestoredPosition | null;

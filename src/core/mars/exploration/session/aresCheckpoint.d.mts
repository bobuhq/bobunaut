export type AresPoint = [number, number, number];

export type AresCheckpoint = {
  version: 1;
  owner: string;
  mode: "walking";
  savedAt: number;
  position: AresPoint;
  yaw: number;
  cameraYaw: number;
  cameraPitch: number;
  parkedShip: {
    spawn: AresPoint;
    ship: AresPoint;
    yaw: number;
  } | null;
};

export function validateAresCheckpoint(
  value: unknown,
  owner: string,
  now?: number
): AresCheckpoint | null;

export function saveAresCheckpoint(
  storage: Storage,
  owner: string,
  value: unknown
): boolean;

export function readAresCheckpoint(
  storage: Storage,
  owner: string
): AresCheckpoint | null;

export function clearAresCheckpoint(
  storage: Storage,
  owner: string
): boolean;

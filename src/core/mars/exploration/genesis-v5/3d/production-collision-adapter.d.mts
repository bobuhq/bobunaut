import type { MarsCollisionObstacle } from "../../components/BobuCharacterController";

export type GenesisPlacement = { x: number; z: number; rotationY: 0 | 90 | 180 | 270 };
export type GenesisDoorOpenState = { surface: boolean; hub: boolean; habitat: boolean };
export const GENESIS_LOCAL_DOORS: ReadonlyArray<{ id: keyof GenesisDoorOpenState; z: number; halfWidth: number; halfDepth: number }>;
export function createGenesisCollisionObstacles(placement: GenesisPlacement, doors?: GenesisDoorOpenState): MarsCollisionObstacle[];
export function genesisLocalToWorld(x: number, z: number, placement: GenesisPlacement): [number, number];
export function genesisWorldToLocal(x: number, z: number, placement: GenesisPlacement): [number, number];
export function genesisInteriorFloorAt(worldX: number, worldZ: number, placement: GenesisPlacement, floorY: number): number | null;

export function genesisBlockingObstacle(x: number, z: number, obstacles: MarsCollisionObstacle[], radius?: number): (MarsCollisionObstacle & { id?: string; doorState?: number | boolean }) | null;

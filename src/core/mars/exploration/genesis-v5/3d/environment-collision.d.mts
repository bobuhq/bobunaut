import type { CircleCollisionVolume, CollisionVolume } from "./structural-collision.mjs";
import type { RegolithStone } from "./terrain-visual-data.mjs";

export const PLAYABLE_BOUNDARY: number;
export const BACKGROUND_RIDGES: readonly Readonly<{ position: [number, number, number]; scale: [number, number, number]; color: string; seed: number }>[];
export const BOULDER_LAYOUT: readonly RegolithStone[];
export const BOULDER_COLLIDERS: readonly CollisionVolume[];
export const REACTOR_COLLIDERS: readonly CircleCollisionVolume[];
export const ENVIRONMENT_COLLIDERS: readonly CollisionVolume[];
export const BACKGROUND_RIDGES_UNREACHABLE: boolean;
export function createBoulderColliders(boulders?: readonly RegolithStone[]): readonly CollisionVolume[];
export function colliderBounds(collider: CollisionVolume): Readonly<{ xMin: number; xMax: number; zMin: number; zMax: number; yMin: number; yMax: number }>;

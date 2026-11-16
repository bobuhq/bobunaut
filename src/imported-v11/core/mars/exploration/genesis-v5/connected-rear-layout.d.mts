import type { CollisionVolume } from './3d/structural-collision.mjs';
export const REAR_AREAS: readonly (readonly [number, number, number, number])[];
type RearBox = Extract<CollisionVolume, { xMin: number }>;
export const REAR_TILES: RearBox[];
export const REAR_WALLS: RearBox[];
export const REAR_DOORS: readonly { x: number; z: number }[];

type CollisionMetadata = Readonly<{ id: string; category: string; yMin: number; yMax: number }>;
export type CollisionVolume = Readonly<CollisionMetadata & (
  | { shape?: "box"; xMin: number; xMax: number; zMin: number; zMax: number }
  | { shape: "circle"; x: number; z: number; radius: number }
)>;
export type BoxCollisionVolume = Extract<CollisionVolume, { xMin: number }>;
export type CircleCollisionVolume = Extract<CollisionVolume, { shape: "circle" }>;
export const STRUCTURAL_COLLIDERS: readonly CollisionVolume[];
export const FURNITURE_COLLIDERS: readonly CollisionVolume[];
export const COLLISION_VOLUMES: readonly CollisionVolume[];
export function sweptCircleTouchesAabb(ax: number, az: number, bx: number, bz: number, radius: number, box: BoxCollisionVolume): boolean;
export function circleTouchesAabb(x: number, z: number, radius: number, box: BoxCollisionVolume): boolean;
export function sweptCircleTouchesCircle(ax: number, az: number, bx: number, bz: number, playerRadius: number, obstacle: CircleCollisionVolume): boolean;
export function circleTouchesCircle(x: number, z: number, radius: number, obstacle: CircleCollisionVolume): boolean;
export function crossesPortal(startZ: number, endZ: number, centerZ: number, openness: number, x: number, openingHalfWidth: number, radius: number): boolean;
export function movementTouchesSolids(ax: number, az: number, bx: number, bz: number, radius: number, solids?: readonly CollisionVolume[]): CollisionVolume | null;

export const CREW_CONSOLES: readonly Readonly<{ x: number; z: number }>[];

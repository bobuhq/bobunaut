import { FURNITURE_COLLIDERS, STRUCTURAL_COLLIDERS } from "./structural-collision.mjs";
import { REACTOR_COLLIDERS } from "./environment-collision.mjs";

export const GENESIS_LOCAL_DOORS = Object.freeze([
  { id: "surface", z: 13.2, halfWidth: 1.65, halfDepth: 0.095 },
  { id: "surface", z: 9.02, halfWidth: 1.65, halfDepth: 0.095 },
  { id: "hub", z: -9.02, halfWidth: 1.8, halfDepth: 0.095 },
  { id: "habitat", z: -26.05, halfWidth: 1.7, halfDepth: 0.095 },
]);

function rotate(x, z, degrees) {
  switch (degrees) {
    case 0: return [x, z];
    case 90: return [z, -x];
    case 180: return [-x, -z];
    case 270: return [-z, x];
    default: throw new RangeError("Genesis placement rotation must be a quarter turn");
  }
}

function transformedBox(x, z, halfWidth, halfDepth, placement) {
  const [rx, rz] = rotate(x, z, placement.rotationY);
  const swaps = placement.rotationY === 90 || placement.rotationY === 270;
  return {
    kind: "box",
    x: placement.x + rx,
    z: placement.z + rz,
    halfWidth: swaps ? halfDepth : halfWidth,
    halfDepth: swaps ? halfWidth : halfDepth,
  };
}

/** Translate deterministic Genesis volumes into the production controller's collision contract. */
export function createGenesisCollisionObstacles(placement, doors = { surface: 0, hub: 0, habitat: 0 }) {
  if (!placement || ![placement.x, placement.z].every(Number.isFinite)) throw new TypeError("Genesis placement coordinates must be finite");
  const result = [];
  for (const volume of [...STRUCTURAL_COLLIDERS, ...FURNITURE_COLLIDERS]) {
    const x = (volume.xMin + volume.xMax) / 2;
    const z = (volume.zMin + volume.zMax) / 2;
    result.push({ ...transformedBox(x, z, (volume.xMax - volume.xMin) / 2, (volume.zMax - volume.zMin) / 2, placement), id: volume.id });
  }
  for (const reactor of REACTOR_COLLIDERS) {
    const [x, z] = rotate(reactor.x, reactor.z, placement.rotationY);
    result.push({ kind: "circle", x: placement.x + x, z: placement.z + z, radius: reactor.radius });
  }
  for (const door of GENESIS_LOCAL_DOORS) {
    if (doors[door.id] >= 0.5) continue;
    result.push({ ...transformedBox(0, door.z, door.halfWidth, door.halfDepth, placement), id: `door-${door.id}-${door.z}`, doorState: doors[door.id] });
  }
  for (const x of [-2.06, 2.06]) result.push(transformedBox(x,11.1,.11,2.2,placement));
  // Ramp rails and foundation posts are solid even though terrain stays unchanged.
  for (const x of [-1.95, 1.95]) result.push(transformedBox(x,19.6,.06,6.4,placement));
  for (const [x,z] of [[-7.4,-40],[7.4,-40],[-7.4,-27],[7.4,-27],[-8.25,5],[8.25,5],[-2.15,-13],[2.15,-13]]) {
    const [rx,rz] = rotate(x,z,placement.rotationY);
    result.push({kind:"circle",x:placement.x+rx,z:placement.z+rz,radius:.27});
  }
  return result;
}

export function genesisLocalToWorld(x, z, placement) {
  const [rx, rz] = rotate(x, z, placement.rotationY);
  return [placement.x + rx, placement.z + rz];
}

export function genesisWorldToLocal(x, z, placement) {
  return rotate(x - placement.x, z - placement.z, (360 - placement.rotationY) % 360);
}

/** Walkable floor regions used by the isolated host's additive controller adapter. */
export function genesisInteriorFloorAt(worldX, worldZ, placement, floorY) {
  const [x, z] = genesisWorldToLocal(worldX, worldZ, placement);
  const regions = [
    { xMin: -1.82, xMax: 1.82, zMin: 9.2, zMax: 13.3 },
    { xMin: -7.65, xMax: 7.65, zMin: -9.25, zMax: 9.25 },
    { xMin: -1.82, xMax: 1.82, zMin: -26.4, zMax: -9.2 },
    { xMin: -6.75, xMax: 6.75, zMin: -42.35, zMax: -26.3 },
  ];
  return regions.some((region) => x >= region.xMin && x <= region.xMax && z >= region.zMin && z <= region.zMax) ? floorY : null;
}

/** Local preview diagnostics use the production 0.48 m capsule footprint. */
export function genesisBlockingObstacle(x, z, obstacles, radius = 0.48) {
  return obstacles.find(o => o.enabled !== false && (o.kind === "box"
    ? Math.hypot(Math.max(Math.abs(x-o.x)-o.halfWidth,0), Math.max(Math.abs(z-o.z)-o.halfDepth,0)) < radius
    : Math.hypot(x-o.x,z-o.z) < radius+o.radius)) ?? null;
}

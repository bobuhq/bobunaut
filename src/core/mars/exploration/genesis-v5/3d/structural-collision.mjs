const FLOOR = 1.2;

function rect(id, x, z, width, depth, category = "wall", yMin = FLOOR - 0.35, yMax = FLOOR + 4.9) {
  return Object.freeze({ id, category, xMin: x - width / 2, xMax: x + width / 2, zMin: z - depth / 2, zMax: z + depth / 2, yMin, yMax });
}

const hubWalls = [
  rect("hub-west-shell", -7.92, 0, 0.42, 18.42),
  rect("hub-east-shell", 7.92, 0, 0.42, 18.42),
  rect("hub-north-west-shell", -5, 8.92, 6, 0.42),
  rect("hub-north-east-shell", 5, 8.92, 6, 0.42),
  rect("hub-south-west-shell", -5, -8.92, 6, 0.42),
  rect("hub-south-east-shell", 5, -8.92, 6, 0.42),
];

const corridorWalls = [
  rect("connector-west-shell", -2.06, -17.5, 0.22, 17.45),
  rect("connector-east-shell", 2.06, -17.5, 0.22, 17.45),
  ...[-11, -14.5, -18, -21.5, -25].flatMap((z, i) => [
    rect(`connector-west-rib-${i}`, -1.86, z, 0.22, 0.38, "structure"),
    rect(`connector-east-rib-${i}`, 1.86, z, 0.22, 0.38, "structure"),
  ]),
];

const habitatWalls = [
  rect("habitat-west-shell", -7.03, -34.5, 0.32, 17.35),
  rect("habitat-east-shell", 7.03, -34.5, 0.32, 17.35),
  rect("habitat-rear-shell", 0, -42.82, 14.52, 0.32),
  // The visual shell has a real wall on both sides of the Habitat airlock.
  rect("habitat-entry-west-shell", -4.55, -26.05, 5.1, 0.32),
  rect("habitat-entry-east-shell", 4.55, -26.05, 5.1, 0.32),
  ...[-6.8, 6.8].map((x, i) => rect(`habitat-structural-post-${i}`, x, -34.5, 0.22, 0.38, "structure")),
];

const doorFrames = [
  ...[{ id: "surface", z: 9.02, width: 3.3 }, { id: "hub", z: -9.02, width: 3.6 }, { id: "habitat", z: -26.05, width: 3.4 }].flatMap(({ id, z, width }) => [
    rect(`${id}-frame-west`, -(width / 2 + 0.13), z, 0.26, 0.44, "frame"),
    rect(`${id}-frame-east`, width / 2 + 0.13, z, 0.26, 0.44, "frame"),
  ]),
];

const hubPosts = [-7.55, 7.55].flatMap((x, side) => [-7, -3.5, 0, 3.5, 7].map((z, index) => rect(`hub-interior-post-${side}-${index}`, x, z, 0.35, 0.34, "structure")));

// New elevated hard surfaces remain inside existing furniture footprints. These
// thin volumes give the unchanged camera solver real canopy/monitor obstacles.
const masterEquipment = [
 ...[-5.45,5.45].flatMap(x => (x < 0 ? [4.5] : [4.5,-4.5]).map(z =>
   rect(`master-monitor-${x}-${z}`,x,z-.48,1.83,.16,"structure",FLOOR+1.345,FLOOR+1.995))),
 ...[-4.9,4.9].flatMap(x=>[-39.3,-35.8,-32.3].flatMap(z=>[
   rect(`master-berth-canopy-${x}-${z}`,x,z-.2,3.2,1.96,"structure",FLOOR+2.08,FLOOR+2.24),
   ...[-1.5,1.5].map(dx=>rect(`master-berth-post-${x}-${z}-${dx}`,x+dx,z-.95,.18,.4,"structure",FLOOR+.37,FLOOR+2.19)),
 ])),
 rect("master-research-instruments",0,-39.88,2.3,.7,"structure",FLOOR+.95,FLOOR+1.31),
 ...[-1,1].map(side=>rect(`master-habitat-skin-${side}`,side*7.3,-35.2,.3,14.1,"structure",0,6.1)),
 rect("master-habitat-rear",0,-43.05,14.2,.2,"structure",0,6.1),
];

export const STRUCTURAL_COLLIDERS = Object.freeze([...hubWalls, ...corridorWalls, ...habitatWalls, ...doorFrames, ...hubPosts, ...masterEquipment,
  ...[-1, 1].flatMap(side => [
    rect(`master-pressure-skin-${side}`, side * 8.3, 0, .5, 18.1, "structure", 0, 6.2),
    ...[-4.8, 4.8].map((z, i) => rect(`master-service-wing-${side}-${i}`, side * 9.6, z, 3.0, 3.6, "structure", 0, 3.4)),
  ]),
]);

// Side-wall bays keep the full axial route and doorway turns clear.
export const CREW_CONSOLES = Object.freeze([
  Object.freeze({ x: -5.45, z: 4.5 }),
  Object.freeze({ x: 5.45, z: 4.5 }),
  Object.freeze({ x: 5.45, z: -4.5 }),
]);

export const FURNITURE_COLLIDERS = Object.freeze([
  ...CREW_CONSOLES.map(({ x, z }, i) => rect(`hub-console-station-${i}`, x, z + 0.5, 2.1, 2.55, "furniture", FLOOR, FLOOR + 1.65)),
  rect("hub-west-wall-console", -6.92, 0.3, 0.3, 4.7, "furniture", FLOOR, FLOOR + 2.75),
  rect("hub-east-wall-console", 6.92, -1, 0.3, 4.7, "furniture", FLOOR, FLOOR + 2.75),
  ...[-4.9, 4.9].flatMap((x, side) => [-39.3, -35.8, -32.3].map((z, index) => rect(`habitat-bed-${side}-${index}`, x, z, 3.35, 2.55, "furniture", FLOOR, FLOOR + 0.82))),
  ...[-4.9, 4.9].map((x, side) => rect(`habitat-locker-${side}`, x, -29.3, 2.6, 1.05, "furniture", FLOOR, FLOOR + 2.35)),
  ...[0, 1, 2].map((row) => rect(`habitat-grow-rack-${row}`, 4.7, -29.2, 2.35, 0.78, "furniture", FLOOR, FLOOR + 2.75)),
  rect("habitat-common-table", 0, -39.5, 2.8, 1.9, "furniture", FLOOR, FLOOR + 0.95),
]);

export const COLLISION_VOLUMES = Object.freeze([...STRUCTURAL_COLLIDERS, ...FURNITURE_COLLIDERS]);

function pointAabbDistanceSquared(x, z, box) {
  const dx = Math.max(box.xMin - x, 0, x - box.xMax);
  const dz = Math.max(box.zMin - z, 0, z - box.zMax);
  return dx * dx + dz * dz;
}

function segmentIntersectsAabb(ax, az, bx, bz, box) {
  let tMin = 0, tMax = 1;
  for (const [start, end, min, max] of [[ax, bx, box.xMin, box.xMax], [az, bz, box.zMin, box.zMax]]) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-12) {
      if (start < min || start > max) return false;
      continue;
    }
    let a = (min - start) / delta, b = (max - start) / delta;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a); tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= 1;
}

function pointSegmentDistanceSquared(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, denominator = dx * dx + dz * dz;
  const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / denominator));
  const ex = ax + dx * t - px, ez = az + dz * t - pz;
  return ex * ex + ez * ez;
}

/** Exact 2D swept-circle against a static axis-aligned volume footprint. */
export function sweptCircleTouchesAabb(ax, az, bx, bz, radius, box) {
  if (![ax, az, bx, bz, radius].every(Number.isFinite) || radius < 0) return true;
  if (segmentIntersectsAabb(ax, az, bx, bz, box)) return true;
  const endpointDistance = Math.min(pointAabbDistanceSquared(ax, az, box), pointAabbDistanceSquared(bx, bz, box));
  if (endpointDistance < radius * radius) return true;
  const corners = [[box.xMin, box.zMin], [box.xMin, box.zMax], [box.xMax, box.zMin], [box.xMax, box.zMax]];
  return corners.some(([x, z]) => pointSegmentDistanceSquared(x, z, ax, az, bx, bz) < radius * radius);
}

export function circleTouchesAabb(x, z, radius, box) {
  if (![x, z, radius].every(Number.isFinite) || radius < 0) return true;
  return pointAabbDistanceSquared(x, z, box) < radius * radius;
}

/** Swept player circle against a round, ground-level obstacle such as the reactor pedestal. */
export function sweptCircleTouchesCircle(ax, az, bx, bz, playerRadius, obstacle) {
  if (![ax, az, bx, bz, playerRadius, obstacle?.x, obstacle?.z, obstacle?.radius].every(Number.isFinite) || playerRadius < 0 || obstacle.radius < 0) return true;
  const combinedRadius = playerRadius + obstacle.radius;
  return pointSegmentDistanceSquared(obstacle.x, obstacle.z, ax, az, bx, bz) < combinedRadius * combinedRadius;
}

export function circleTouchesCircle(x, z, radius, obstacle) {
  if (![x, z, radius, obstacle?.x, obstacle?.z, obstacle?.radius].every(Number.isFinite) || radius < 0 || obstacle.radius < 0) return true;
  return Math.hypot(x - obstacle.x, z - obstacle.z) < radius + obstacle.radius;
}

/** Door slabs block all crossings until the existing collision-safe threshold. */
export function crossesPortal(startZ, endZ, centerZ, openness, x, openingHalfWidth, radius) {
  if (![startZ, endZ, centerZ, openness, x, openingHalfWidth, radius].every(Number.isFinite)) return true;
  const crossed = (startZ - centerZ) * (endZ - centerZ) <= 0 && startZ !== endZ;
  if (!crossed || Math.abs(x) > openingHalfWidth + radius) return false;
  return openness < 0.5 || Math.abs(x) + radius >= openingHalfWidth;
}

export function movementTouchesSolids(ax, az, bx, bz, radius, solids = COLLISION_VOLUMES) {
  return solids.find((volume) => volume.shape === "circle"
    ? sweptCircleTouchesCircle(ax, az, bx, bz, radius, volume)
    : sweptCircleTouchesAabb(ax, az, bx, bz, radius, volume)) ?? null;
}

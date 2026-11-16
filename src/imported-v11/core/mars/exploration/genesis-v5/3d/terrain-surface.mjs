export const TERRAIN_SIZE = 210;
export const TERRAIN_SEGMENTS = 72;
export const TERRAIN_HALF_SIZE = TERRAIN_SIZE / 2;
export const TERRAIN_STEP = TERRAIN_SIZE / TERRAIN_SEGMENTS;
export const MAX_WALKABLE_SLOPE_DEGREES = 32;
export const MAX_GROUND_STEP_UP = 0.22;
export const MAX_GROUND_STEP_DOWN = 0.38;

const FLOOR = 1.2;

function smoothstep(value, min, max) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

/** Height assigned to each actual PlaneGeometry vertex. */
export function terrainVertexHeight(x, z) {
  const edge = Math.max(Math.abs(x) - 13, Math.abs(z) - 23, 0);
  const blend = smoothstep(edge, 0, 22);
  const hills = 0.34 * Math.sin(x * 0.105) * Math.cos(z * 0.083) + 0.19 * Math.sin((x + z) * 0.21);
  const rise = Math.max(0, Math.sin(x * 0.023 + z * 0.012)) * 4.2;
  // Blend the surface entry grade across several terrain columns. A hard
  // |x| < 2.4 cutoff covered only one PlaneGeometry vertex column (the grid
  // spacing is 2.9167 m), creating an unintended near-vertical depression
  // wall that the walkability rule correctly rejected.
  const approachWidth = 30;
  const approachAcross = 1 - smoothstep(Math.abs(x), 1.45, approachWidth);
  const approach = approachAcross * smoothstep(z, 13, 26);
  const blended = (FLOOR - 0.035) * (1 - blend) + (hills + rise) * blend;
  // BufferAttribute positions are Float32; mirror their stored vertex height
  // so physics does not drift from the GPU-visible mesh by quantization.
  return Math.fround(blended * (1 - approach) + (FLOOR - (z - 13) * 0.065) * approach);
}

/**
 * Sample the same +Z-row grid and b-d diagonal used by THREE.PlaneGeometry
 * after rotateX(-PI/2). Returns null outside the finite mesh or for bad inputs.
 */
export function sampleTerrainSurface(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > TERRAIN_HALF_SIZE || Math.abs(z) > TERRAIN_HALF_SIZE) return null;

  const coord = i => Math.fround(i * TERRAIN_STEP - TERRAIN_HALF_SIZE);
  let ix = Math.min(TERRAIN_SEGMENTS - 1, Math.floor((x + TERRAIN_HALF_SIZE) / TERRAIN_STEP));
  let iz = Math.min(TERRAIN_SEGMENTS - 1, Math.floor((z + TERRAIN_HALF_SIZE) / TERRAIN_STEP));
  while (ix > 0 && x < coord(ix)) ix--;
  while (ix < TERRAIN_SEGMENTS - 1 && x > coord(ix + 1)) ix++;
  while (iz > 0 && z < coord(iz)) iz--;
  while (iz < TERRAIN_SEGMENTS - 1 && z > coord(iz + 1)) iz++;
  const x0 = coord(ix), x1 = coord(ix + 1);
  const z0 = coord(iz), z1 = coord(iz + 1);
  const u = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  const v = Math.max(0, Math.min(1, (z - z0) / (z1 - z0)));
  // PlaneGeometry indices are [a,b,d] and [b,c,d]; after rotation b-d
  // runs from upper-left to lower-right in world X/Z coordinates.
  const ha = terrainVertexHeight(x0, z0);
  const hb = terrainVertexHeight(x0, z1);
  const hc = terrainVertexHeight(x1, z1);
  const hd = terrainVertexHeight(x1, z0);

  let height, dx, dz, triangle;
  if (u + v <= 1) {
    height = ha * (1 - u - v) + hb * v + hd * u;
    dx = (hd - ha) / (x1 - x0);
    dz = (hb - ha) / (z1 - z0);
    triangle = 0;
  } else {
    height = hb * (1 - u) + hc * (u + v - 1) + hd * (1 - v);
    dx = (hc - hb) / (x1 - x0);
    dz = (hc - hd) / (z1 - z0);
    triangle = 1;
  }
  const slopeDegrees = Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI;
  return { height, dx, dz, slopeDegrees, cell: [ix, iz], triangle };
}

export function sampleWalkableGround(x, z, interiorFloors = []) {
  for (const region of interiorFloors) {
    if (Math.abs(x - region.x) <= region.halfWidth && Math.abs(z - region.z) <= region.halfDepth) {
      return { height: region.height, dx: 0, dz: 0, slopeDegrees: 0, cell: null, triangle: null, kind: "interior" };
    }
  }
  const sample = sampleTerrainSurface(x, z);
  return sample ? { ...sample, kind: "terrain" } : null;
}

export function canFollowGround(fromHeight, next, {
  maxSlopeDegrees = MAX_WALKABLE_SLOPE_DEGREES,
  maxStepUp = MAX_GROUND_STEP_UP,
  maxStepDown = MAX_GROUND_STEP_DOWN,
} = {}) {
  if (!Number.isFinite(fromHeight) || !next || !Number.isFinite(next.height) || !Number.isFinite(next.slopeDegrees)) return false;
  const delta = next.height - fromHeight;
  return next.slopeDegrees <= maxSlopeDegrees && delta <= maxStepUp && delta >= -maxStepDown;
}

/** Keep an outdoor third-person camera and its view ray above the sampled mesh. */
export function keepCameraAboveTerrain(look, eye, clearance = 0.55) {
  const dx = eye.x - look.x, dz = eye.z - look.z;
  let requiredEyeY = eye.y;
  for (let i = 1; i <= 12; i++) {
    const t = i / 13;
    const sample = sampleTerrainSurface(look.x + dx * t, look.z + dz * t);
    if (!sample) continue;
    const rayY = look.y + (eye.y - look.y) * t;
    if (rayY < sample.height + clearance) {
      requiredEyeY = Math.max(requiredEyeY, (sample.height + clearance - look.y * (1 - t)) / t);
    }
  }
  const endpoint = sampleTerrainSurface(eye.x, eye.z);
  if (endpoint) requiredEyeY = Math.max(requiredEyeY, endpoint.height + clearance);
  eye.y = requiredEyeY;
  return eye;
}

function segmentBoxEntry(start, end, box) {
  let minT = 0, maxT = 1;
  for (const axis of ["x", "y", "z"]) {
    const delta = end[axis] - start[axis];
    const min = box[`${axis}Min`], max = box[`${axis}Max`];
    if (Math.abs(delta) < 1e-9) {
      if (start[axis] < min || start[axis] > max) return null;
      continue;
    }
    let a = (min - start[axis]) / delta, b = (max - start[axis]) / delta;
    if (a > b) [a, b] = [b, a];
    minT = Math.max(minT, a); maxT = Math.min(maxT, b);
    if (minT > maxT) return null;
  }
  return maxT >= 0 && minT <= 1 ? Math.max(0, minT) : null;
}

/** Pull an indoor camera in front of furniture crossed by the look-to-eye ray. */
export function keepCameraInFrontOfFurniture(look, eye, boxes, margin = 0.12) {
  let firstHit = 1;
  for (const box of boxes) {
    const hit = segmentBoxEntry(look, eye, box);
    if (hit !== null && hit > 0.025) firstHit = Math.min(firstHit, hit);
  }
  if (firstHit < 1) {
    const t = Math.max(0.08, firstHit - margin);
    eye.x = look.x + (eye.x - look.x) * t;
    eye.y = look.y + (eye.y - look.y) * t;
    eye.z = look.z + (eye.z - look.z) * t;
  }
  return eye;
}

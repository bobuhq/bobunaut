/** DEV-route walkable top for the authored V11 platform and its terrain approach. */
export const CAMPUS_PLATFORM_LOCAL_BOUNDS = Object.freeze({ xMin: -84, xMax: 36, zMin: -64, zMax: 32 });
// South edge faces the original ARES Hub. This compact entrance joins terrain
// immediately outside the authored platform to its unchanged top surface.
export const CAMPUS_RAMP_LOCAL_BOUNDS = Object.freeze({ xMin: -84, xMax: -80, zMin: -72, zMax: -64 });

export function createCampusWalkSurface({ rootX, rootZ, platformTop, terrainAt }) {
  return (worldX, worldZ) => {
    const x = worldX - rootX;
    const z = worldZ - rootZ;
    const platform = CAMPUS_PLATFORM_LOCAL_BOUNDS;
    if (x >= platform.xMin && x <= platform.xMax && z >= platform.zMin && z <= platform.zMax) {
      return platformTop;
    }

    const ramp = CAMPUS_RAMP_LOCAL_BOUNDS;
    if (x < ramp.xMin || x > ramp.xMax || z < ramp.zMin || z > ramp.zMax) return null;

    const t = (z - ramp.zMin) / (ramp.zMax - ramp.zMin);
    const start = terrainAt(worldX, rootZ + ramp.zMin);
    const terrain = terrainAt(worldX, worldZ);
    const designedSlope = start + (platformTop - start) * t;
    // The ramp follows any higher terrain so it never becomes an invisible pit.
    return Math.max(terrain + 0.015, designedSlope);
  };
}

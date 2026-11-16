export function createCampusWalkSurface({ rootX, rootZ, platformTop, terrainAt }: {
    rootX: any;
    rootZ: any;
    platformTop: any;
    terrainAt: any;
}): (worldX: any, worldZ: any) => any;
/** DEV-route walkable top for the authored V11 platform and its terrain approach. */
export const CAMPUS_PLATFORM_LOCAL_BOUNDS: Readonly<{
    xMin: -84;
    xMax: 36;
    zMin: -64;
    zMax: 32;
}>;
export const CAMPUS_RAMP_LOCAL_BOUNDS: Readonly<{
    xMin: -84;
    xMax: -80;
    zMin: -72;
    zMax: -64;
}>;

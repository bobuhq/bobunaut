export type RegolithStone = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: number;
};

export function createRegolithStones(
  sampleSurface: (x: number, z: number) => { height: number; slopeDegrees: number } | null,
  count?: number,
): RegolithStone[];

export function createBoulderField(
  sampleSurface: (x: number, z: number) => { height: number; slopeDegrees: number } | null,
  count?: number,
): RegolithStone[];

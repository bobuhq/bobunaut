type Point = { x: number; y: number; z: number };
type Box = { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number };
export function cameraSolids(doors: {surface: number; hub: number; habitat: number}): Box[];
export function constrainGenesisEye(look: Point, eye: Point, solids: Box[], padding?: number): Point;

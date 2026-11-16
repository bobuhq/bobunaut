import type { BufferGeometry, Matrix4 } from 'three';
export const REAR_PORTAL: Readonly<{xMin:number;xMax:number;yMin:number;yMax:number;zMin:number;zMax:number}>;
export function subtractPortal(source: BufferGeometry, toHost: Matrix4, box?: typeof REAR_PORTAL): BufferGeometry;

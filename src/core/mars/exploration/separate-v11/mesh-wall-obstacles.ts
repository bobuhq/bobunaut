import * as THREE from 'three';
export type WallObstacle={kind:'box';x:number;z:number;halfWidth:number;halfDepth:number};

/** Horizontal body-height section of the actual cut shell, with <= 4cm excess thickness. */
export function meshWallObstacles(mesh: THREE.Mesh, toRoot: THREE.Matrix4, height = 1.35): WallObstacle[] {
  const { geometry } = mesh;
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const count = index?.count ?? position.count;
  const result: WallObstacle[] = [];

  const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const intersections = [new THREE.Vector3(), new THREE.Vector3()];
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    for (let j = 0; j < 3; j++) {
      vertices[j].fromBufferAttribute(position, index ? index.getX(i + j) : i + j).applyMatrix4(toRoot);
    }
    let hits = 0;
    for (let j = 0; j < 3 && hits < intersections.length; j++) {
      const a = vertices[j];
      const b = vertices[(j + 1) % 3];
      const da = a.y - height;
      const db = b.y - height;
      if (da * db < 0) intersections[hits++].copy(a).lerp(b, da / (da - db));
      else if (Math.abs(da) < 1e-7) intersections[hits++].copy(a);
    }
    if (hits < 2) continue;

    const [a, b] = intersections;
    const segments = Math.max(1, Math.ceil(a.distanceTo(b) / .25));
    for (let j = 0; j < segments; j++) {
      start.copy(a).lerp(b, j / segments);
      end.copy(a).lerp(b, (j + 1) / segments);
      result.push({
        kind: 'box',
        x: (start.x + end.x) / 2,
        z: (start.z + end.z) / 2,
        halfWidth: Math.max(.035, Math.abs(end.x - start.x) / 2),
        halfDepth: Math.max(.035, Math.abs(end.z - start.z) / 2),
      });
    }
  }
  return result;
}

import * as THREE from 'three';

// Subtract a rectangular passage from triangles, rather than hiding whole walls
// or clipping only their material. Only private DEV mesh geometries are replaced.
export const REAR_PORTAL = Object.freeze({ xMin: -1.8, xMax: 1.8, yMin: 1.19, yMax: 4.5, zMin: -9.4, zMax: -8.1 });
export function subtractPortal(source, toHost, box = REAR_PORTAL) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const inverse = toHost.clone().invert();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const vertices = [], normals = [], uvs = [], groups = [];
  const planes = [['x', box.xMin, 1], ['x', box.xMax, -1], ['y', box.yMin, 1], ['y', box.yMax, -1], ['z', box.zMin, 1], ['z', box.zMax, -1]];
  const mix = (a, b, t) => ({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), uv: a.uv.clone().lerp(b.uv, t) });
  function split(poly, axis, edge, sign) {
    const inside = [], outside = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a.p[axis] - edge) * sign, db = (b.p[axis] - edge) * sign;
      (da >= 0 ? inside : outside).push(a);
      if ((da >= 0) !== (db >= 0)) { const v = mix(a, b, da / (da - db)); inside.push(v); outside.push(v); }
    }
    return [inside, outside];
  }
  function emit(poly, materialIndex) {
    const start = vertices.length / 3;
    for (let j = 1; j + 1 < poly.length; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) {
      vertices.push(...v.p.clone().applyMatrix4(inverse).toArray()); normals.push(...v.n.toArray()); uvs.push(...v.uv.toArray());
    }
    if (vertices.length / 3 > start) groups.push({ start, count: vertices.length / 3 - start, materialIndex });
  }
  for (let i = 0; i < position.count; i += 3) {
    let poly = [0, 1, 2].map(j => ({ p: new THREE.Vector3().fromBufferAttribute(position, i + j).applyMatrix4(toHost), n: normal ? new THREE.Vector3().fromBufferAttribute(normal, i + j) : new THREE.Vector3(0, 1, 0), uv: uv ? new THREE.Vector2().fromBufferAttribute(uv, i + j) : new THREE.Vector2() }));
    const materialIndex = geometry.groups.find(g => i >= g.start && i < g.start + g.count)?.materialIndex ?? 0;
    for (const [axis, edge, sign] of planes) {
      if (poly.length < 3) break;
      const [inside, outside] = split(poly, axis, edge, sign);
      emit(outside, materialIndex); poly = inside;
    }
    // The remaining polygon is inside all six planes: remove it.
  }
  geometry.dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  for (const g of groups) result.addGroup(g.start, g.count, g.materialIndex);
  result.computeBoundingBox(); result.computeBoundingSphere();
  return result;
}

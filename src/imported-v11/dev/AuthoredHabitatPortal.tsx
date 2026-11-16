// Extracted from final V11. Only architecture dependencies retained.
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { REAR_PORTAL, subtractPortal } from './rear-portal-geometry.mjs';
export function RearPortal({ children, genesis = false }: { children: React.ReactNode; genesis?: boolean }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const host = root.current!; host.updateWorldMatrix(true, true);
    const inverse = host.matrixWorld.clone().invert();
    const portal = genesis ? { ...REAR_PORTAL, zMin: -43.4, zMax: -42.3 } : REAR_PORTAL;
    const replacements: Array<{ mesh: THREE.Mesh; original: THREE.BufferGeometry; cut: THREE.BufferGeometry }> = [];
    const passage = new THREE.Box3(new THREE.Vector3(portal.xMin, portal.yMin, portal.zMin), new THREE.Vector3(portal.xMax, portal.yMax, portal.zMax));
    host.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const matrix = inverse.clone().multiply(object.matrixWorld);
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox!.clone().applyMatrix4(matrix).intersectsBox(passage)) return;
      const original = object.geometry, cut = subtractPortal(original, matrix, portal);
      object.geometry = cut; replacements.push({ mesh: object, original, cut });
    });
    host.userData.portalMeshes = replacements.length;
    return () => { for (const { mesh, original, cut } of replacements) { mesh.geometry = original; cut.dispose(); } };
  }, [genesis]);
  return <group ref={root} name="dev-only-rear-portal">{children}</group>;
}

// Extracted from final V11. Only architecture dependencies retained.
import { Suspense, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CINEMATIC_KIT_URL } from './cinematic-layout.mjs';
const genesisReflection = (() => {
  const faces = Array.from({ length: 6 }, (_, face) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, face === 3 ? '#5c4439' : '#ccd8df');
    g.addColorStop(.55, '#82929a'); g.addColorStop(1, '#554337');
    c.fillStyle = g; c.fillRect(0, 0, 32, 32); return canvas;
  });
  const texture = new THREE.CubeTexture(faces); texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true; texture.name = 'Genesis-only static engineering reflection'; return texture;
})();
function useKit(originalCorridor = false) {
  const kit = useLoader(GLTFLoader, originalCorridor ? '/mars/final-v11/v85/genesis-cinematic-kit.glb' : CINEMATIC_KIT_URL);
  // Only the shared emerald guide surface bypasses ACES; scene lighting stays intact.
  useMemo(() => {
    kit.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshStandardMaterial;
        if (!originalCorridor && material.name !== 'green' && material.name !== 'display') { material.envMap = genesisReflection; material.envMapIntensity = .65; material.needsUpdate = true; }
        if (material.name === 'green') { material.toneMapped = false; material.needsUpdate = true; }
      }
    });
  }, [kit, originalCorridor]);
  return kit;
}
function pieces(kit: GLTF, asset: string) {
  const meshes: THREE.Mesh[] = [];
  kit.scene.traverse(object => {
    if (object instanceof THREE.Mesh && object.name.startsWith(asset + '__')) meshes.push(object);
  });
  return meshes;
}
function AirlockModel({ width }: { width: number }) {
  const kit = useKit();
  const meshes = useMemo(() => pieces(kit, 'green-airlock').map(source => {
    const mesh = source.clone(); mesh.castShadow = false; mesh.receiveShadow = true;
    return mesh;
  }), [kit]);
  // Nominal 3.3m opening; scale X only, preserving the established doorway aperture.
  return <group scale={[width / 3.3, 1, 1]} dispose={null}>
    {meshes.map(mesh => <primitive key={mesh.uuid} object={mesh} />)}
  </group>;
}
export function GreenAirlockFrame({ width, z }: { width: number; z: number }) {
  return <group name="master-pressure-airlock" position={[0, 1.2, z]}>
    <Suspense fallback={null}><AirlockModel width={width} /></Suspense>
  </group>;
}
export function PressureDoorLeaf({ width, z }: { width: number; z: number }) {
  return <group position={[0, 1.2, z]} scale={[width / 3.3, 1, 1]}>
    <Suspense fallback={null}><LeafModel /></Suspense>
  </group>;
}
function LeafModel() {
  const kit = useKit();
  const meshes = useMemo(() => pieces(kit, 'door-leaf').map(source => {
    const mesh = source.clone(); mesh.castShadow = false; mesh.receiveShadow = true; return mesh;
  }), [kit]);
  return <group dispose={null}>{meshes.map(mesh => <primitive key={mesh.uuid} object={mesh} />)}</group>;
}

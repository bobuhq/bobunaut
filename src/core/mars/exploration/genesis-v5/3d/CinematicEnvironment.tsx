import { Suspense, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CINEMATIC_KIT_URL, cinematicLayout, type CinematicPlacement } from './cinematic-layout.mjs';

type Room = keyof typeof cinematicLayout;

// Analytic local reflection probe: static broad softbox sky and warm ground, no capture,
// no lights and no scene.environment assignment. Renderer prefilters this cube once.
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

// Cached kits have separate materials: only master surfaces receive the local reflection map.
function useKit(originalCorridor = false) {
  const kit = useLoader(GLTFLoader, originalCorridor ? '/mars/ares-genesis/v85/genesis-cinematic-kit.glb' : CINEMATIC_KIT_URL);
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

/** Build once per room: all repeated modules merge into one draw per shared material. */
function RoomModels({ room }: { room: Room }) {
  const kit = useKit(room === 'corridor');
  const meshes = useMemo(() => {
    kit.scene.updateMatrixWorld(true);
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const placement of cinematicLayout[room] as CinematicPlacement[]) {
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(...placement.position),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.yaw),
        new THREE.Vector3(1, 1, 1));
      for (const source of pieces(kit, placement.asset)) {
        const geometry = source.geometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(transform, source.matrixWorld));
        const material = source.material as THREE.Material;
        const bucket = buckets.get(material) ?? []; bucket.push(geometry); buckets.set(material, bucket);
      }
    }
    return [...buckets].map(([material, geometries]) => {
      const geometry = mergeGeometries(geometries, false)!;
      geometries.forEach(g => g.dispose());
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${room === 'corridor' ? 'v85' : 'master'}-${room}-${material.name}`;
      mesh.receiveShadow = true; mesh.castShadow = false;
      return mesh;
    });
  }, [kit, room]);
  useEffect(() => () => meshes.forEach(mesh => mesh.geometry.dispose()), [meshes]);
  return <group dispose={null}>{meshes.map(mesh => <primitive key={mesh.uuid} object={mesh} />)}</group>;
}

export function CinematicRooms() {
  return <>{(['control', 'corridor', 'habitat'] as const).map(room =>
    // Synchronous wrapper is discovered by the existing culling registry before async GLB loading.
    <group key={room} name={`v81-${room}-details`} userData={{ genesisRoom: room, genesisDetails: true }}>
      <Suspense fallback={null}><RoomModels room={room} /></Suspense>
    </group>)}</>;
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

/** Exterior remains visible independently of room/portal detail culling. */
export function CinematicExterior() {
  return <group name="master-integrated-exterior"><Suspense fallback={null}><RoomModels room="exterior" /></Suspense></group>;
}

/** Shared kit leaf attached to the original moving groups, with unchanged envelope. */
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

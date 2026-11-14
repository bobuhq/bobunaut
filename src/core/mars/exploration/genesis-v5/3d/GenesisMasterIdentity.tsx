import { Suspense, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
/** Original project wordmark; no invented insignia. Static texture, no network or frame work. */
export function GenesisMasterIdentity() {
  const kit = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#17272e'; c.fillRect(0, 0, 1024, 256);
    c.fillStyle = '#a571d8'; c.fillRect(26, 32, 8, 192);
    c.fillStyle = '#e5ede9'; c.font = 'bold 104px sans-serif'; c.textAlign = 'center';
    c.fillText('BOBU GENESIS', 530, 122);
    c.fillStyle = '#54d6a0'; c.font = '30px monospace'; c.fillText('ARES / RESEARCH STATION / 01', 530, 187);
    c.fillStyle = '#86a4ac'; c.font = '20px monospace'; c.fillText('PRESSURIZED ACCESS     •     AUTHORIZED CREW', 530, 227);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    const geometry = new THREE.PlaneGeometry(3.8, .95);
    return { texture, material, geometry };
  }, []);
  useEffect(() => () => { kit.texture.dispose(); kit.material.dispose(); kit.geometry.dispose(); }, [kit]);
  return <group><Suspense fallback={null}><BobuInsignia /></Suspense><mesh name="master-bobu-genesis-identification" position={[0, 5.56, 9.57]} geometry={kit.geometry} material={kit.material} /></group>;
}

function BobuInsignia() {
  const texture = useLoader(THREE.TextureLoader, '/images/bobu/logo.png');
  useMemo(() => { texture.colorSpace = THREE.SRGBColorSpace; }, [texture]);
  return <mesh position={[-3.72, 4.7, 9.44]}><planeGeometry args={[.64,.64]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}

/** Footings terminate on sampled terrain, including uneven installation sites. */
export function GenesisMasterFoundations({ surfaceAtLocal }: { surfaceAtLocal: (x: number, z: number) => number | null }) {
  const feet = useMemo(() => [-1,1].flatMap(side => [-4.8,4.8].flatMap(z => [-1,1].map(end => {
    const x = side * 9.6, pz = z + end * 1.25;
    const ground = surfaceAtLocal(x, pz);
    return ground !== null && Number.isFinite(ground) && ground < .2 ? {x, z:pz, ground} : null;
  }))).filter((p): p is {x:number;z:number;ground:number} => p !== null), [surfaceAtLocal]);
  return <group name="master-terrain-footings">{feet.map(p => <mesh key={`${p.x}:${p.z}`} position={[p.x,(p.ground+.3)/2,p.z]}>
    <cylinderGeometry args={[.22,.40,.3-p.ground,8]} /><meshStandardMaterial color="#56636a" roughness={.72} metalness={.18} />
  </mesh>)}</group>;
}

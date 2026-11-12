import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CampusSite } from './campus-layout.mjs';

/** Decorative fixtures stay inside the existing sealed platform envelope.
 * Opacity glass avoids a transmission render pass; no added dynamic lights. */
export function BiodomeLighting({ site }: { site: CampusSite }) {
 const blue = useRef<THREE.MeshBasicMaterial>(null);
 const root = useRef<THREE.Group>(null);
 useEffect(() => {
  // The host campus keeps cached GLB assets alive with dispose=null.
  // Release only this component's private fixtures on every unmount.
  const group = root.current;
  return () => group?.traverse(object => {
   if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => material.dispose());
   }
  });
 }, []);
 useFrame(({ clock }) => {
  if (blue.current) blue.current.opacity = .68 + .22 * Math.sin(clock.elapsedTime * 1.6);
 });
 return <group ref={root} name="v90-botanical-glass-fanus" position={[site.x, site.deck + 1.45, site.z]}>
  <group scale={[1.45, 1, 1]}>
  <mesh>
   <sphereGeometry args={[3.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
   <meshStandardMaterial color="#84d7ed" transparent opacity={.22} roughness={.14} metalness={.35} depthWrite={false} side={THREE.DoubleSide} />
  </mesh>
  {[0, Math.PI / 3, -Math.PI / 3].map(yaw => <group key={yaw} rotation={[0, yaw, 0]}>
   <mesh rotation={[0, 0, 0]}><torusGeometry args={[3.82, .045, 5, 40, Math.PI]} /><meshStandardMaterial color="#8daebd" metalness={.65} roughness={.4} /></mesh>
  </group>)}
  <mesh rotation={[-Math.PI / 2, 0, 0]}>
   <torusGeometry args={[3.83, .075, 6, 48]} />
   <meshBasicMaterial ref={blue} color="#269fff" transparent toneMapped={false} />
  </mesh>
  </group>
  {[-1, 1].map(side => <mesh key={side} position={[side * 5.65, -.5, 0]}>
   <boxGeometry args={[.07, .12, 6.4]} /><meshBasicMaterial color="#55baff" toneMapped={false} />
  </mesh>)}
 </group>;
}

/** Flush, paired approach guides follow the same ramp as the walking surface. */
export function PremiumCourtyard({ endY }: { endY: number }) {
 const slope = Math.atan2(1.2 - endY, 12.8);
 return <group name="v90-integrated-courtyard">
  {[-1, 1].flatMap(side => [0, 1, 2, 3, 4].map(i => {
   const z = 14.4 + i * 2.35, y = 1.2 + (endY - 1.2) * (z - 13.2) / 12.8;
   return <group key={`${side}:${i}`} position={[side * 2.35, y, z]} rotation={[slope, 0, 0]}>
    <mesh><boxGeometry args={[.24, .10, 1.55]} /><meshStandardMaterial color="#26373d" metalness={.6} roughness={.5} /></mesh>
    <mesh position={[0, .06, 0]}><boxGeometry args={[.065, .025, 1.3]} /><meshBasicMaterial color={i===0 ? '#b9e6e9' : '#3dde96'} toneMapped={false} /></mesh>
   </group>;
  }))}
  {[-1, 1].map(side => <group key={side} position={[side * 2.45, 2.9, 13.7]}>
   <mesh><boxGeometry args={[.22, 3.45, .23]} /><meshStandardMaterial color="#293f48" metalness={.55} roughness={.4} /></mesh>
   <mesh position={[-side * .116, 0, .02]}><boxGeometry args={[.025, 2.95, .1]} /><meshBasicMaterial color="#44eb9c" toneMapped={false} /></mesh>
  </group>)}
 </group>;
}

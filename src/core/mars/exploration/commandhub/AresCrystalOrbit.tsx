import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CRYSTALS = [
  { angle: 0, radius: 0.86, speed: 0.36, scale: 0.17, height: 0.1 },
  { angle: 1.2, radius: 1.02, speed: 0.3, scale: 0.12, height: -0.14 },
  { angle: 2.3, radius: 0.87, speed: 0.47, scale: 0.19, height: 0.24 },
  { angle: 3.6, radius: 1.16, speed: 0.25, scale: 0.13, height: 0.01 },
  { angle: 4.75, radius: 0.92, speed: 0.39, scale: 0.15, height: -0.17 },
  { angle: 5.45, radius: 1.08, speed: 0.33, scale: 0.11, height: 0.13 },
];

export function AresCrystalOrbit() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  const pulse = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < CRYSTALS.length; i += 1) {
      const spec = CRYSTALS[i];
      const obj = refs.current[i];
      if (!obj) continue;
      const a = spec.angle + t * spec.speed;
      obj.position.set(
        Math.cos(a) * spec.radius,
        spec.height + Math.sin(t * 1.5 + i) * 0.11,
        Math.sin(a) * spec.radius,
      );
      obj.rotation.set(t * 0.35, t * 0.8 + i, Math.sin(t + i) * 0.2);
    }
    if (pulse.current) pulse.current.opacity = 0.22 + 0.12 * Math.sin(t * 2.4);
  });
  return (
    <group>
      {CRYSTALS.map((p, i) => (
        <group key={i} ref={(node) => { refs.current[i] = node; }}>
          <mesh scale={[p.scale, p.scale * 1.6, p.scale]} castShadow>
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial color="#e1abff" emissive="#8e2de4"
              emissiveIntensity={1.6} roughness={0.19} metalness={0.2}
              transparent opacity={0.87} />
          </mesh>
          <mesh scale={[p.scale * 0.55, p.scale * 0.94, p.scale * 0.55]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#f5d9ff" toneMapped={false} transparent opacity={0.82} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 0]}>
        <ringGeometry args={[0.79, 0.83, 64]} />
        <meshBasicMaterial ref={pulse} color="#b261ff" transparent opacity={0.25}
          side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]}>
        <ringGeometry args={[1.04, 1.07, 64]} />
        <meshBasicMaterial color="#873cd6" transparent opacity={0.3}
          side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

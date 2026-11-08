import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function RadarDish({
  position,
  scale = 1,
  rotationSpeed = 0.3,
  accent = "#7ef4ff",
}: {
  position: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
  accent?: string;
}) {
  const headRef = useRef<THREE.Group | null>(null);
  const sweepRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (headRef.current) {
      headRef.current.rotation.y += delta * rotationSpeed;
      headRef.current.rotation.z = Math.sin(t * 0.7 + position[0]) * 0.08;
    }
    if (sweepRef.current) {
      sweepRef.current.rotation.z = t * 1.6;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 1.8, 14]} />
        <meshStandardMaterial color="#d5dbe6" metalness={0.92} roughness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 1.92, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.22, 14]} />
        <meshStandardMaterial color="#5f6977" metalness={0.82} roughness={0.22} />
      </mesh>
      <group ref={headRef} position={[0, 2.02, 0]}>
        <mesh castShadow rotation={[0.16, 0, 0]} position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.22, 18, 18]} />
          <meshStandardMaterial color="#b6beca" metalness={0.86} roughness={0.16} />
        </mesh>
        <mesh castShadow position={[0, 0.06, 0.62]} rotation={[-0.2, 0, 0]}>
          <sphereGeometry args={[0.84, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <meshStandardMaterial color="#d8dde7" metalness={0.84} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.05, 0.62]} rotation={[-0.18, 0, 0]}>
          <sphereGeometry args={[0.73, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2.15]} />
          <meshPhysicalMaterial
            color="#597a8c"
            emissive="#123b52"
            emissiveIntensity={0.24}
            roughness={0.08}
            metalness={0.22}
            transparent
            opacity={0.38}
            transmission={0.25}
            clearcoat={1}
            clearcoatRoughness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh castShadow position={[0, 0.04, 0.12]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 1.02, 10]} />
          <meshStandardMaterial color="#6f7784" metalness={0.84} roughness={0.19} />
        </mesh>
        <mesh castShadow position={[0, -0.04, 0.56]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.42, 0.018, 8, 40]} />
          <meshStandardMaterial color="#7d8696" metalness={0.82} roughness={0.22} />
        </mesh>
        <mesh ref={sweepRef} position={[0, 0.1, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.08, 0.04]} />
          <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 0.18, 0.58]} color={accent} intensity={1.8} distance={4} decay={2} />
      </group>
    </group>
  );
}

export function AresCommandHubV37RadarCrown() {
  return (
    <group>
      <mesh position={[-2.4, 11.35, -0.8]} castShadow>
        <cylinderGeometry args={[0.22, 0.38, 4.7, 12]} />
        <meshStandardMaterial color="#8394a7" metalness={0.88} roughness={0.26} />
      </mesh>
      <group position={[-2.4, 13.7, -0.8]}>
        <mesh castShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[1.7, 1.95, 0.5, 18]} />
          <meshStandardMaterial color="#5f6977" metalness={0.8} roughness={0.26} />
        </mesh>
        <mesh position={[0, 0.56, 0]}>
          <torusGeometry args={[1.76, 0.06, 8, 48]} />
          <meshBasicMaterial color="#b56cff" toneMapped={false} transparent opacity={0.68} />
        </mesh>
        <mesh position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.42, 14]} />
          <meshStandardMaterial color="#d0d6df" metalness={0.92} roughness={0.12} />
        </mesh>
      </group>

      <RadarDish position={[-2.4, 14.05, -0.8]} scale={1.22} rotationSpeed={0.42} accent="#c084ff" />
      <RadarDish position={[-4.5, 12.3, -1.85]} scale={0.95} rotationSpeed={0.34} accent="#79ff6b" />
      <RadarDish position={[4.5, 12.3, -1.85]} scale={0.95} rotationSpeed={0.38} accent="#7ef4ff" />

      <mesh position={[-4.5, 10.3, -1.85]}>
        <cylinderGeometry args={[0.12, 0.22, 4.0, 12]} />
        <meshStandardMaterial color="#d0d6df" metalness={0.88} roughness={0.15} />
      </mesh>
      <mesh position={[4.5, 10.3, -1.85]}>
        <cylinderGeometry args={[0.12, 0.22, 4.0, 12]} />
        <meshStandardMaterial color="#d0d6df" metalness={0.88} roughness={0.15} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[-2.4 + side * 1.25, 13.2, -0.8]} rotation={[0, 0, side * 0.18]}>
          <boxGeometry args={[0.14, 1.3, 0.14]} />
          <meshStandardMaterial color="#cfd5df" metalness={0.92} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

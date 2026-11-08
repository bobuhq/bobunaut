import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ARES_COMMAND_HUB_POSITION } from "./AresCommandHubCollision";

/**
 * 1m proximity sensor for the *visual* entrance doors.
 * The real collision entrance remains open to avoid trapping players.
 */
export function AresSensorAirlockV36({
  targetRef,
}: {
  targetRef: React.RefObject<THREE.Group | null>;
}) {
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.MeshBasicMaterial>(null);
  const openingRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const target = targetRef.current;
    let shouldOpen = false;
    if (target) {
      const dx = target.position.x - ARES_COMMAND_HUB_POSITION.x;
      const dz = target.position.z - (ARES_COMMAND_HUB_POSITION.z + 8.68);
      // One metre around the doorway plane. Keep open when crossing the threshold.
      shouldOpen = Math.abs(dx) <= 2.0 && Math.abs(dz) <= 1.0;
    }
    const goal = shouldOpen ? 1 : 0;
    openingRef.current = THREE.MathUtils.damp(openingRef.current, goal, 5.5, delta);
    if (leftRef.current) leftRef.current.position.x = -0.86 - openingRef.current * 1.12;
    if (rightRef.current) rightRef.current.position.x = 0.86 + openingRef.current * 1.12;
    if (lightRef.current) {
      lightRef.current.color.set(shouldOpen ? "#79ff6b" : "#ffd06d");
      lightRef.current.opacity = 0.7 + 0.3 * Math.sin(clock.elapsedTime * 5) ** 2;
    }
  });

  return (
    <group position={[0, 0, 8.68]}>
      {/* Freestanding visual panels. Existing collision gap is untouched. */}
      <group ref={leftRef} position={[-0.86, 0, 0]}>
        <mesh position={[0, 1.65, 0.14]} castShadow>
          <boxGeometry args={[1.69, 3.3, 0.14]} />
          <meshStandardMaterial color="#172735" metalness={0.85} roughness={0.24} />
        </mesh>
        <mesh position={[0, 1.65, 0.23]}>
          <boxGeometry args={[1.49, 2.6, 0.018]} />
          <meshPhysicalMaterial color="#426c85" transparent opacity={0.59} roughness={0.06} metalness={0.17} clearcoat={1} depthWrite={false} />
        </mesh>
        <mesh position={[0.72, 1.65, 0.25]}>
          <boxGeometry args={[0.06, 2.95, 0.018]} />
          <meshBasicMaterial color="#79ff6b" toneMapped={false} />
        </mesh>
      </group>
      <group ref={rightRef} position={[0.86, 0, 0]}>
        <mesh position={[0, 1.65, 0.14]} castShadow>
          <boxGeometry args={[1.69, 3.3, 0.14]} />
          <meshStandardMaterial color="#172735" metalness={0.85} roughness={0.24} />
        </mesh>
        <mesh position={[0, 1.65, 0.23]}>
          <boxGeometry args={[1.49, 2.6, 0.018]} />
          <meshPhysicalMaterial color="#426c85" transparent opacity={0.59} roughness={0.06} metalness={0.17} clearcoat={1} depthWrite={false} />
        </mesh>
        <mesh position={[-0.72, 1.65, 0.25]}>
          <boxGeometry args={[0.06, 2.95, 0.018]} />
          <meshBasicMaterial color="#79ff6b" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 3.56, 0.2]}>
        <boxGeometry args={[3.94, 0.21, 0.22]} />
        <meshStandardMaterial color="#2b414f" metalness={0.78} roughness={0.24} />
      </mesh>
      <mesh position={[0, 3.61, 0.33]}>
        <boxGeometry args={[1.0, 0.11, 0.024]} />
        <meshBasicMaterial ref={lightRef} color="#ffd06d" toneMapped={false} transparent opacity={1} />
      </mesh>
      <mesh position={[0, 3.9, 0.35]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshBasicMaterial color="#79ff6b" toneMapped={false} />
      </mesh>
    </group>
  );
}

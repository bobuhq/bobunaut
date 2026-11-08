import { AresBobuOperatorWorkstations } from "./AresBobuOperatorWorkstations";
import { AresBobuOperationsScreens } from "./AresBobuOperationsScreens";
import { AresCommandHubV31Facility } from "./AresCommandHubV31Facility";
import { AresNASAHabitatPreview } from "./AresNASAHabitatPreview";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Command Center V2: architectural visuals only.
 * Decorative annexes are intentionally outside the existing walkable
 * and collision footprint. No RPC, progression, or terminal changes.
 */
function CommandConsole({
  x,
  z,
  rotation = 0,
}: {
  x: number;
  z: number;
  rotation?: number;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.15, 1.02, 0.75]} />
        <meshStandardMaterial color="#212734" metalness={0.62} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.18, -0.09]} rotation={[-0.38, 0, 0]}>
        <boxGeometry args={[1.94, 0.55, 0.06]} />
        <meshStandardMaterial color="#15283e" emissive="#07314c" emissiveIntensity={0.38} metalness={0.32} roughness={0.31} />
      </mesh>
      {[-0.65, -0.25, 0.15, 0.55].map((dx, index) => (
        <mesh key={dx} position={[dx, 1.19, 0.015]} rotation={[-0.38, 0, 0]}>
          <boxGeometry args={[0.25, index % 2 ? 0.14 : 0.23, 0.015]} />
          <meshBasicMaterial color={index === 2 ? "#b976f0" : "#66d7eb"} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.64, 0.387]}>
        <boxGeometry args={[1.75, 0.045, 0.026]} />
        <meshBasicMaterial color="#9660c4" toneMapped={false} />
      </mesh>
    </group>
  );
}

function HolographicNavigationTable() {
  const ring = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ring.current) {
      ring.current.rotation.y += Math.min(delta, 0.05) * 0.2;
      ring.current.position.y = 2.02 + Math.sin(state.clock.elapsedTime * 1.1) * 0.055;
    }
  });
  return (
    <group position={[0, 0, 0.55]}>
      <mesh position={[0, 0.21, 0]} receiveShadow>
        <cylinderGeometry args={[1.6, 1.72, 0.42, 12]} />
        <meshStandardMaterial color="#222934" metalness={0.73} roughness={0.33} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.52, 1.08, 0.56, 12]} />
        <meshStandardMaterial color="#485366" metalness={0.75} roughness={0.27} />
      </mesh>
      <mesh position={[0, 0.89, 0]}>
        <cylinderGeometry args={[1.48, 1.4, 0.12, 12]} />
        <meshStandardMaterial color="#141b2b" metalness={0.55} roughness={0.3} emissive="#151331" emissiveIntensity={0.23} />
      </mesh>
      <mesh position={[0, 0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.12, 1.34, 48]} />
        <meshBasicMaterial color="#6bcbdc" transparent opacity={0.74} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={ring} position={[0, 2.02, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.65, 1]} />
          <meshBasicMaterial color="#9552d7" wireframe transparent opacity={0.48} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, 0.2, 0]}>
          <torusGeometry args={[1.03, 0.019, 6, 48]} />
          <meshBasicMaterial color="#60d6ec" transparent opacity={0.68} depthWrite={false} />
        </mesh>
        <mesh rotation={[0.15, 0.3, 0]}>
          <torusGeometry args={[0.86, 0.016, 6, 48]} />
          <meshBasicMaterial color="#d58aff" transparent opacity={0.72} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export function AresCommandCenterV2Interior() {
  return (
    <group>
      <AresBobuOperatorWorkstations />
      <AresBobuOperationsScreens />
      {/* Existing circulation and interactive terminals remain untouched. */}
      <HolographicNavigationTable />
      <CommandConsole x={-5.78} z={-4.6} rotation={Math.PI / 2} />
      <CommandConsole x={5.78} z={-4.6} rotation={-Math.PI / 2} />
      <CommandConsole x={-5.78} z={4.35} rotation={Math.PI / 2} />
      <CommandConsole x={5.78} z={4.35} rotation={-Math.PI / 2} />
      {[-5.2, -2.6, 2.6, 5.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 3.98, -6.1]}>
            <boxGeometry args={[1.9, 0.09, 3.1]} />
            <meshStandardMaterial color="#303743" metalness={0.8} roughness={0.28} />
          </mesh>
          <mesh position={[x, 3.9, -6.1]}>
            <boxGeometry args={[1.6, 0.035, 2.85]} />
            <meshBasicMaterial color="#536f8c" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 7.18, 2.82, 0]}>
          {[-5.6, -2.3, 1, 4.3].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[2.55, 0.9]} />
              <meshStandardMaterial color="#23405a" emissive="#0b3b58" emissiveIntensity={0.4} roughness={0.36} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Annex({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 10.3, 0, -1.25]}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[4.5, 4.65, 0.25, 8]} />
        <meshStandardMaterial color="#46434a" metalness={0.55} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.02, 4.26, 3.9, 8]} />
        <meshStandardMaterial color="#49515e" metalness={0.7} roughness={0.38} />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <cylinderGeometry args={[4.53, 3.78, 0.85, 8]} />
        <meshStandardMaterial color="#b1bac7" metalness={0.76} roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <cylinderGeometry args={[4.08, 4.08, 0.16, 8]} />
        <meshStandardMaterial color="#6a3e8c" emissive="#4f2479" emissiveIntensity={0.95} metalness={0.42} roughness={0.38} />
      </mesh>
      {[-1, 1].map((zside) => (
        <mesh key={zside} position={[0, 2.1, zside * 3.89]}>
          <boxGeometry args={[3.6, 1.25, 0.08]} />
          <meshStandardMaterial color="#2b5670" emissive="#12425a" emissiveIntensity={0.38} metalness={0.44} roughness={0.24} />
        </mesh>
      ))}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.48, 0.68, 1.3, 8]} />
        <meshStandardMaterial color="#49546b" metalness={0.84} roughness={0.28} />
      </mesh>
      <mesh position={[0, 6.05, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshBasicMaterial color="#86d9e6" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function AresCommandCenterV2Exterior() {
  return (
    <group>
      <AresNASAHabitatPreview />
      <AresCommandHubV31Facility />
      <Annex side={-1} />
      <Annex side={1} />
      {/* Perimeter command crown: open middle preserves the existing radar. */}
      <mesh position={[0, 5.35, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7.15, 0.27, 8, 64]} />
        <meshStandardMaterial color="#76859b" metalness={0.79} roughness={0.35} />
      </mesh>
      <mesh position={[0, 5.45, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.86, 0.065, 6, 64]} />
        <meshBasicMaterial color="#ae69d9" transparent opacity={0.8} />
      </mesh>
      {/* Exterior bridge cladding is decorative, not accessible to players. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 7.75, 2.25, -1.25]} castShadow>
            <boxGeometry args={[4.7, 2.65, 4.6]} />
            <meshStandardMaterial color="#515967" metalness={0.72} roughness={0.36} />
          </mesh>
          <mesh position={[side * 7.75, 2.4, 1.08]}>
            <boxGeometry args={[3.6, 0.6, 0.08]} />
            <meshStandardMaterial color="#255d71" emissive="#0b3f50" emissiveIntensity={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

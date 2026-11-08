import * as THREE from "three";

/**
 * Command Hub V3.1 main silhouette upgrade.
 * Decorative ONLY. No collision or walkable-surface changes.
 * The tall transparent canopy sits above the existing Command Hub.
 */
const GLASS = "#67b3d3";
const GREEN = "#79ff6b";

function ArmoredRail({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.7, 0]} castShadow>
        <boxGeometry args={[0.72, 5.4, 0.92]} />
        <meshStandardMaterial color="#283849" metalness={0.81} roughness={0.28} />
      </mesh>
      <mesh position={[0, 4.65, 0.49]}>
        <boxGeometry args={[0.28, 2.1, 0.05]} />
        <meshBasicMaterial color="#52b3c3" toneMapped={false} transparent opacity={0.68} />
      </mesh>
    </group>
  );
}

function PanoramicPane({ x, z, ry = 0 }: { x: number; z: number; ry?: number }) {
  return (
    <group position={[x, 3.25, z]} rotation={[0, ry, 0]}>
      <mesh>
        <boxGeometry args={[3.35, 2.95, 0.065]} />
        <meshPhysicalMaterial
          color={GLASS}
          metalness={0.24}
          roughness={0.08}
          transparent
          opacity={0.43}
          clearcoat={1}
          clearcoatRoughness={0.06}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.51, 0]}>
        <boxGeometry args={[3.58, 0.13, 0.22]} />
        <meshStandardMaterial color="#879cae" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, -1.51, 0]}>
        <boxGeometry args={[3.58, 0.18, 0.22]} />
        <meshStandardMaterial color="#334758" metalness={0.79} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <boxGeometry args={[0.07, 2.95, 0.05]} />
        <meshStandardMaterial color="#758da0" metalness={0.8} roughness={0.27} />
      </mesh>
    </group>
  );
}

function GlassCommandDome() {
  return (
    <group position={[0, 5.2, -0.9]}>
      {/* Big upper hemisphere, much taller than original small ship roof. */}
      <mesh renderOrder={3}>
        <sphereGeometry args={[10.4, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#5b9bb8"
          transparent
          opacity={0.27}
          metalness={0.22}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* True curved dome ribs and perimeter rings. */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation={[0, (Math.PI / 8) * i, 0]}>
          <torusGeometry args={[10.42, 0.13, 8, 56, Math.PI]} />
          <meshStandardMaterial color="#899dae" metalness={0.86} roughness={0.23} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[10.47, 0.38, 10, 80]} />
        <meshStandardMaterial color="#37485a" metalness={0.88} roughness={0.24} />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[10.35, 0.045, 6, 80]} />
        <meshBasicMaterial color="#65d8ee" toneMapped={false} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 10.35, 0]}>
        <cylinderGeometry args={[0.7, 1.35, 0.3, 16]} />
        <meshStandardMaterial color="#d5dde3" metalness={0.88} roughness={0.19} />
      </mesh>
      <mesh position={[0, 10.68, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshBasicMaterial color={GREEN} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GreenAirlock() {
  return (
    <group position={[0, 0, 8.68]}>
      {/* Keep the doorway physically open: no opaque blocking mesh. */}
      {[-2.18, 2.18].map((x) => (
        <group key={x} position={[x, 1.95, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.53, 3.9, 0.66]} />
            <meshStandardMaterial color="#24313d" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[x < 0 ? 0.28 : -0.28, 0, 0.38]}>
            <boxGeometry args={[0.17, 3.75, 0.11]} />
            <meshBasicMaterial color={GREEN} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.93, 0]} castShadow>
        <boxGeometry args={[4.92, 0.48, 0.77]} />
        <meshStandardMaterial color="#263746" metalness={0.86} roughness={0.25} />
      </mesh>
      <mesh position={[0, 3.65, 0.43]}>
        <boxGeometry args={[4.38, 0.16, 0.1]} />
        <meshBasicMaterial color={GREEN} toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.25, 0.44]}>
        <boxGeometry args={[3.7, 0.1, 0.1]} />
        <meshBasicMaterial color="#c0ff9b" toneMapped={false} />
      </mesh>
      {[-1.4, -0.7, 0, 0.7, 1.4].map((x) => (
        <mesh key={x} position={[x, 0.06, 1.24]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 2.0]} />
          <meshBasicMaterial color={GREEN} transparent opacity={0.7} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <pointLight position={[0, 3.3, 0.8]} color="#8cff80" intensity={3} distance={9} decay={2} />
    </group>
  );
}


/** Diamond-shard buttresses beyond the player's original walkable footprint. */
function CrystalFacadeV36() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-6.0, -1.4, 3.2].map((z, i) => (
            <group key={z} position={[side * 12.8, 0.75, z]}>
              <mesh castShadow rotation={[0, i * 0.36, side * 0.1]} position={[0, 2.25, 0]}>
                <octahedronGeometry args={[1.4, 0]} />
                <meshPhysicalMaterial color="#9f65dc" emissive="#6329a4" emissiveIntensity={0.64} metalness={0.23} roughness={0.08} clearcoat={1} transparent opacity={0.9} />
              </mesh>
              <mesh position={[0, 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.95, 1.22, 0.7, 8]} />
                <meshStandardMaterial color="#253644" metalness={0.78} roughness={0.3} />
              </mesh>
              <pointLight position={[0, 2.3, 0]} color="#a75aff" intensity={1.1} distance={3.2} decay={2} />
            </group>
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`rail-${side}`} position={[side * 11.7, 4.4, -0.8]}>
          <boxGeometry args={[0.17, 0.17, 14.5]} />
          <meshBasicMaterial color="#b98aff" transparent opacity={0.75} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function AresCommandHubV31Facility() {
  return (
    <group>
      <GlassCommandDome />
      <CrystalFacadeV36 />
      <GreenAirlock />
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-5.6, -1.5, 2.6].map((z) => (
            <PanoramicPane key={z} x={side * 9.8} z={z} ry={Math.PI / 2} />
          ))}
          <ArmoredRail x={side * 9.85} z={-7.7} />
          <ArmoredRail x={side * 9.85} z={6.1} />
          <PanoramicPane x={side * 6.25} z={7.95} />
          <mesh position={[side * 11.8, 0.3, -3.7]}>
            <boxGeometry args={[4.4, 0.6, 12.6]} />
            <meshStandardMaterial color="#3e5264" metalness={0.68} roughness={0.37} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

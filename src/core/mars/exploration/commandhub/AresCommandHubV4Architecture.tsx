import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * BOBU Command Hub V4: exterior architectural visual upgrade.
 * Overall design footprint ~33m wide x 33m deep; only the ORIGINAL
 * Command Hub interior (16x18) is navigable in this preview.
 * No NPC, collision, placement, Supabase or production changes.
 * The existing airlock remains at +Z. Keep its approach clear.
 */
const ARMOR = "#394858";
const FRAME = "#b1bbc8";
const DEEP = "#0d1824";
const CYAN = "#64d8ec";
const PURPLE = "#a95de8";

function ArmorPanel({
  position, args, color = ARMOR, rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} metalness={0.79} roughness={0.28} />
    </mesh>
  );
}

function GlassFacade({
  position, args, color = "#427487",
}: {
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.14}
        roughness={0.1}
        transparent
        opacity={0.64}
        transmission={0.12}
        clearcoat={0.94}
        clearcoatRoughness={0.08}
        emissive="#123443"
        emissiveIntensity={0.22}
        depthWrite={false}
      />
    </mesh>
  );
}

function CrystalPillar({ position, scale = 1 }: {
  position: [number, number, number]; scale?: number;
}) {
  const crystal = useRef<THREE.Group | null>(null);
  useFrame(({ clock }) => {
    if (!crystal.current) return;
    crystal.current.rotation.y = clock.elapsedTime * 0.16;
    crystal.current.position.y = Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.08;
  });
  return (
    <group position={position} scale={scale}>
      <ArmorPanel position={[0, 0.35, 0]} args={[1.2, 0.65, 1.2]} color="#687587" />
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.6, 8]} />
        <meshStandardMaterial color="#7b8492" metalness={0.88} roughness={0.19} />
      </mesh>
      <group ref={crystal} position={[0, 1.55, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.74, 0]} />
          <meshPhysicalMaterial color="#b370ff" emissive="#6822bc" emissiveIntensity={1.45} metalness={0.12} roughness={0.12} clearcoat={1} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.05, 0.026, 6, 32]} />
          <meshBasicMaterial color={PURPLE} toneMapped={false} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function CommandWing({ side }: { side: -1 | 1 }) {
  const cx = side * 11.5;
  return (
    <group position={[cx, 0, -1.6]}>
      {/* Large articulated wings incorporate existing V2 annexes rather than hide them. */}
      <ArmorPanel position={[0, 0.2, 0]} args={[9.5, 0.44, 16.8]} color="#56606e" />
      <ArmorPanel position={[0, 1.38, 0]} args={[9.0, 2.32, 15.5]} color={DEEP} />
      <ArmorPanel position={[0, 3.78, 0]} args={[9.3, 2.5, 15.1]} color={ARMOR} />
      <ArmorPanel position={[0, 5.2, 0]} args={[9.55, 0.44, 16.1]} color="#8492a3" />
      <ArmorPanel position={[0, 5.55, 0]} args={[7.8, 0.24, 13.4]} color="#253342" />

      {/* Broad panoramic observation curtain: 3 independent bays per facade. */}
      {[-4.8, 0, 4.8].map((z, i) => (
        <group key={i}>
          <GlassFacade position={[side * 4.54, 3.2, z]} args={[0.13, 2.25, 3.92]} />
          <ArmorPanel position={[side * 4.68, 3.2, z - 2]} args={[0.2, 2.5, 0.2]} color={FRAME} />
          <ArmorPanel position={[side * 4.68, 3.2, z + 2]} args={[0.2, 2.5, 0.2]} color={FRAME} />
          <ArmorPanel position={[side * 4.68, 2.03, z]} args={[0.24, 0.14, 3.98]} color={FRAME} />
          <ArmorPanel position={[side * 4.68, 4.39, z]} args={[0.24, 0.14, 3.98]} color={FRAME} />
          <ArmorPanel position={[side * 4.73, 3.12, z]} args={[0.1, 0.07, 3.73]} color={CYAN} />
        </group>
      ))}
      {/* Glassed front command bridge, but away from main entry. */}
      <GlassFacade position={[0, 3.28, 7.65]} args={[7.7, 2.48, 0.12]} />
      {[-3.9, -1.95, 0, 1.95, 3.9].map((x) => (
        <ArmorPanel key={x} position={[x, 3.28, 7.78]} args={[0.14, 2.52, 0.14]} color={FRAME} />
      ))}
      <ArmorPanel position={[0, 4.58, 7.74]} args={[8.1, 0.18, 0.24]} color={FRAME} />
      <ArmorPanel position={[0, 2.01, 7.74]} args={[8.1, 0.18, 0.24]} color={FRAME} />
      {/* Low armored roof spine with BOBU purple crystal energy rail. */}
      <ArmorPanel position={[0, 5.76, 0]} args={[7.4, 0.17, 13.0]} color="#7d8b9a" />
      <mesh position={[0, 5.88, 0]}>
        <boxGeometry args={[0.13, 0.08, 12.4]} />
        <meshBasicMaterial color={PURPLE} toneMapped={false} />
      </mesh>
      <CrystalPillar position={[side * 4.1, 5.72, 5.7]} scale={0.65} />
    </group>
  );
}

function GroundApproach() {
  return (
    <group>
      {/* Wider runway in front of original airlock, but no walkable collision change. */}
      <ArmorPanel position={[0, -0.22, 10.5]} args={[8.8, 0.24, 7.0]} color="#414c5b" />
      {[-3.7, 3.7].map((x) => (
        <group key={x}>
          <ArmorPanel position={[x, -0.075, 10.5]} args={[0.16, 0.02, 6.3]} color="#97a5b4" />
          {Array.from({length: 6}, (_, i) => (
            <mesh key={i} position={[x, -0.047, 8.1 + i * 0.88]}>
              <boxGeometry args={[0.12, 0.018, 0.48]} />
              <meshBasicMaterial color="#79ff6b" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {[-2.5, -1.25, 1.25, 2.5].map((x) => (
        <ArmorPanel key={x} position={[x, -0.085, 10.1]} args={[0.08, 0.018, 5.2]} color="#597586" />
      ))}
    </group>
  );
}

function TowerDish({ accent, speed }: { accent: string; speed: number }) {
  const turn = useRef<THREE.Group | null>(null);
  useFrame((_, delta) => { if (turn.current) turn.current.rotation.y += Math.min(delta, 0.05) * speed; });
  return (
    <group ref={turn} position={[0, 1.08, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.35, 0.52, 0.55, 12]} />
        <meshStandardMaterial color="#b5c3ce" metalness={0.86} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.54, 0]} rotation={[0.35, 0, 0]} castShadow>
        <sphereGeometry args={[1.34, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color="#a7b7c7" metalness={0.82} roughness={0.17} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[0.35, 0, 0]}>
        <torusGeometry args={[1.16, 0.055, 9, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RadarTower({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 15.0, 0, -8.8]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[2.05, 2.3, 0.3, 12]} />
        <meshStandardMaterial color="#5b6673" metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh position={[0, 3.7, 0]} castShadow>
        <cylinderGeometry args={[1.42, 2.07, 7.1, 12]} />
        <meshStandardMaterial color="#384657" metalness={0.82} roughness={0.27} />
      </mesh>
      <GlassFacade position={[0, 5.6, 0]} args={[2.65, 0.8, 2.65]} />
      <mesh position={[0, 7.4, 0]}>
        <cylinderGeometry args={[2.05, 1.85, 0.38, 16]} />
        <meshStandardMaterial color="#c2ced8" metalness={0.82} roughness={0.22} />
      </mesh>
      <mesh position={[0, 7.67, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.62, 1.87, 36]} />
        <meshBasicMaterial color={side === -1 ? CYAN : PURPLE} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, 7.65, 0]}>
        <TowerDish accent={side === -1 ? CYAN : PURPLE} speed={side === -1 ? 0.32 : -0.27} />
      </group>
      <mesh position={[0, 9.55, -0.4]}>
        <sphereGeometry args={[0.19, 14, 10]} />
        <meshBasicMaterial color="#ff6a6a" toneMapped={false} />
      </mesh>
    </group>
  );
}

function OuterFoundation() {
  return (
    <group>
      <mesh position={[0, -0.27, -1.6]} receiveShadow>
        <cylinderGeometry args={[16.6, 17.2, 0.36, 24]} />
        <meshStandardMaterial color="#343f4c" metalness={0.58} roughness={0.48} />
      </mesh>
      <mesh position={[0, -0.07, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[15.6, 16.05, 64]} />
        <meshStandardMaterial color="#6c8195" metalness={0.78} roughness={0.27} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = i * Math.PI / 6;
        const x = 16 * Math.cos(a);
        const z = -1.6 + 16 * Math.sin(a);
        return (
          <mesh key={i} position={[x, -0.045, z]} rotation={[-Math.PI / 2, 0, a]}>
            <planeGeometry args={[0.85, 0.09]} />
            <meshBasicMaterial color={i % 3 === 0 ? PURPLE : CYAN} transparent opacity={0.62} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

export function AresCommandHubV4Architecture() {
  return (
    <group>
      {/* LOCAL ISOLATION: OuterFoundation temporarily hidden to test body clipping. */}
      <CommandWing side={-1} />
      <CommandWing side={1} />
      <RadarTower side={-1} />
      <RadarTower side={1} />
      {/* LOCAL TEST: GroundApproach hidden to isolate entrance clipping. */}
      {/* The original dome, flag, sensor doors and interactive interiors remain. */}
    </group>
  );
}

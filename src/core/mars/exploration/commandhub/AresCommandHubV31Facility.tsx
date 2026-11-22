import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

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


type DomeBeaconMode = "double" | "pulse" | "single";

function DomeBeacon({
  name,
  position,
  color,
  mode,
}: {
  name: string;
  position: [number, number, number];
  color: string;
  mode: DomeBeaconMode;
}) {
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const lastPulseUpdate = useRef(-Infinity);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // V22.1: limit continuous pulse material updates to 30 Hz.
    // Preserve the original timing of single/double flashes.
    if (mode === "pulse") {
      if (
        t >= lastPulseUpdate.current &&
        t - lastPulseUpdate.current < 1 / 30
      ) return;
      lastPulseUpdate.current = t;
    }

    const phase = t % 2.4;

    let brightness: number;

    if (mode === "double") {
      brightness =
        (phase < 0.14 || (phase > 0.3 && phase < 0.44))
          ? 1
          : 0.12;
    } else if (mode === "pulse") {
      brightness = 0.2 + 0.8 *
        (0.5 + 0.5 * Math.sin(t * Math.PI * 1.2));
    } else {
      brightness = (t % 1.65) < 0.22 ? 1 : 0.12;
    }

    // Avoid redundant writes while a beacon holds its brightness.
    if (
      lamp.current &&
      Math.abs(lamp.current.opacity - brightness) > 0.001
    ) {
      lamp.current.opacity = brightness;
    }

    const haloBrightness = brightness * 0.65;
    if (
      halo.current &&
      Math.abs(halo.current.opacity - haloBrightness) > 0.001
    ) {
      halo.current.opacity = haloBrightness;
    }
  });

  return (
    <group name={`ares-v21-beacon-${name}`} position={position}>
      <mesh>
        <cylinderGeometry args={[0.24, 0.34, 0.34, 10]} />
        <meshStandardMaterial
          color="#bdcbd8"
          metalness={0.8}
          roughness={0.24}
        />
      </mesh>

      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.33, 12, 10]} />
        <meshBasicMaterial
          ref={lamp}
          color={color}
          transparent
          opacity={1}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.52, 12, 10]} />
        <meshBasicMaterial
          ref={halo}
          color={color}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
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
          color="#b9e7f5"
          transparent
          opacity={0.12}
          metalness={0.08}
          roughness={0.12}
          clearcoat={0.85}
          clearcoatRoughness={0.08}
          emissive="#234c69"
          emissiveIntensity={0.19}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* True curved dome ribs and perimeter rings. */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation={[0, (Math.PI / 8) * i, 0]}>
          <torusGeometry args={[10.42, 0.13, 8, 56, Math.PI]} />
          <meshStandardMaterial
            color="#bdcbd8"
            metalness={0.76}
            roughness={0.24}
            emissive="#263c50"
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[10.47, 0.38, 10, 80]} />
        <meshStandardMaterial
          color="#8fa9bd"
          metalness={0.78}
          roughness={0.25}
          emissive="#20364c"
          emissiveIntensity={0.24}
        />
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

      {/* V21: decorative BOBU purple crystal energy core.
          Visual only: no gameplay or resource production changes. */}
      <group name="ares-v21-dome-crystal" position={[0, 4.1, 0]}>
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[1.65, 0]} />
          <meshStandardMaterial
            color="#cb93ff"
            emissive="#8b39f5"
            emissiveIntensity={3.4}
            roughness={0.14}
            metalness={0.16}
            toneMapped={false}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.8, 0, 0]}>
          <torusGeometry args={[2.15, 0.055, 8, 64]} />
          <meshBasicMaterial
            color="#b06aff"
            toneMapped={false}
          />
        </mesh>

        <mesh rotation={[0, Math.PI / 3, Math.PI / 2.8]}>
          <torusGeometry args={[2.35, 0.04, 8, 64]} />
          <meshBasicMaterial
            color="#6eeaff"
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* V21.5: animated visual-only aviation beacons. */}
      <group name="ares-v21-navigation-beacons">
        <DomeBeacon name="red" position={[-6.2, 5.65, 6.2]}
          color="#ff3333" mode="double" />
        <DomeBeacon name="amber" position={[0, 5.65, 9]}
          color="#ffcc22" mode="pulse" />
        <DomeBeacon name="green" position={[6.2, 5.65, 6.2]}
          color="#39ff65" mode="single" />
      </group>

      {/* V21.6: xenon-blue architectural accent rails.
          Decorative emissive surfaces; no additional scene lights. */}
      <group name="ares-v21-xenon-dome-accents">
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 4.8, 0.75, 8.7]}
              rotation={[0, side * 0.48, 0]}
            >
              <boxGeometry args={[3.4, 0.12, 0.08]} />
              <meshBasicMaterial
                color="#8ef2ff"
                toneMapped={false}
              />
            </mesh>

            <mesh
              position={[side * 4.8, 0.63, 8.69]}
              rotation={[0, side * 0.48, 0]}
            >
              <boxGeometry args={[3.5, 0.035, 0.09]} />
              <meshBasicMaterial
                color="#3b8cb4"
                transparent
                opacity={0.75}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 0.69, 9.15]}>
          <boxGeometry args={[5.4, 0.085, 0.08]} />
          <meshBasicMaterial
            color="#7feaff"
            toneMapped={false}
          />
        </mesh>
      </group>
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

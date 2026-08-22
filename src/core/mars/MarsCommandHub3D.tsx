import {
  Canvas,
  useFrame,
} from "@react-three/fiber";
import {
  ContactShadows,
  RoundedBox,
} from "@react-three/drei";
import {
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";

type Props = {
  level: number;
};

function CrystalCore() {
  const crystal =
    useRef<THREE.Group>(null);

  const innerMaterial =
    useRef<THREE.MeshStandardMaterial>(null);

  const outerMaterial =
    useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (crystal.current) {
      crystal.current.rotation.y =
        t * 0.26;

      crystal.current.rotation.z =
        Math.sin(t * 0.35) * 0.035;

      const pulse =
        1 +
        Math.sin(t * 2.15) * 0.055;

      crystal.current.scale.setScalar(
        pulse * 1.08,
      );
    }

    if (innerMaterial.current) {
      innerMaterial.current.emissiveIntensity =
        6.4 +
        Math.sin(t * 2.5) * 2.1 +
        Math.sin(t * 0.65) * 0.7;
    }

    if (outerMaterial.current) {
      outerMaterial.current.emissiveIntensity =
        2.1 +
        Math.sin(t * 2.1) * 0.72;
    }
  });

  return (
    <group
      ref={crystal}
      position={[0, 1.18, 0]}
    >
      {/* outer crystal shell */}
      <mesh>
        <octahedronGeometry
          args={[0.68, 1]}
        />

        <meshPhysicalMaterial
          ref={outerMaterial}
          color="#d9a6ff"
          emissive="#a52fff"
          emissiveIntensity={2.8}
          transmission={0.14}
          thickness={0.18}
          roughness={0.035}
          metalness={0}
          transparent
          opacity={0.84}
          clearcoat={1}
          clearcoatRoughness={0.015}
          ior={1.5}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* living internal energy */}
      <mesh scale={0.58}>
        <icosahedronGeometry
          args={[0.72, 2]}
        />

        <meshStandardMaterial
          ref={innerMaterial}
          color="#f1c7ff"
          emissive="#ad36ff"
          emissiveIntensity={5}
          roughness={0.08}
          metalness={0.04}
        />
      </mesh>

      {/* vertical crystal needle */}
      <mesh
        position={[0, 0.62, 0]}
      >
        <octahedronGeometry
          args={[0.19, 0]}
        />

        <meshStandardMaterial
          color="#f6d8ff"
          emissive="#c85cff"
          emissiveIntensity={4.5}
          roughness={0.06}
        />
      </mesh>

      <pointLight
        color="#b145ff"
        intensity={7.5}
        distance={6}
        decay={2}
      />
    </group>
  );
}

function CommandHubLevelOne() {
  const radar =
    useRef<THREE.Group>(null);

  const beaconMaterial =
    useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;

    if (radar.current) {
      radar.current.rotation.y +=
        delta * 0.46;
    }

    if (beaconMaterial.current) {
      beaconMaterial.current.emissiveIntensity =
        3.4 +
        Math.sin(t * 4.8) * 1.15;
    }
  });

  const purple =
    useMemo(
      () => new THREE.Color("#a83cff"),
      [],
    );

  const warm =
    useMemo(
      () => new THREE.Color("#ffb35f"),
      [],
    );

  return (
    <group
      rotation={[0, -0.16, 0]}
      position={[0, -0.12, 0]}
    >
      {/* ===============================================
          FOUNDATION — LOW INDUSTRIAL PLATFORM
          =============================================== */}

      <mesh
        position={[0, 0.08, 0]}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            3.42,
            3.7,
            0.24,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#121820"
          metalness={0.8}
          roughness={0.56}
        />
      </mesh>

      <mesh
        position={[0, 0.225, 0]}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            3.05,
            3.3,
            0.08,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#303947"
          metalness={0.88}
          roughness={0.31}
        />
      </mesh>

      {/* BOBU purple foundation circuit */}

      <mesh
        position={[0, 0.275, 0]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            2.46,
            2.58,
            64,
          ]}
        />

        <meshStandardMaterial
          color="#ab4dff"
          emissive={purple}
          emissiveIntensity={2.2}
          roughness={0.16}
        />
      </mesh>

      {/* ===============================================
          CENTRAL FACETED GLASS / CRYSTAL DOME
          =============================================== */}

      {/* armored lower ring */}

      <mesh
        position={[0, 0.57, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[
            2.18,
            2.45,
            0.62,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#252e3b"
          metalness={0.86}
          roughness={0.28}
        />
      </mesh>

      {/* faceted BOBU crystal-glass dome */}

      <mesh
        position={[0, 0.88, 0]}
        castShadow
      >
        <sphereGeometry
          args={[
            1.72,
            20,
            12,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />

        <meshPhysicalMaterial
          color="#bca2d2"
          transmission={0.2}
          thickness={0.24}
          roughness={0.12}
          metalness={0.04}
          transparent
          opacity={0.34}
          depthWrite={false}
          clearcoat={1}
          clearcoatRoughness={0.025}
          ior={1.48}
          emissive="#4d146d"
          emissiveIntensity={0.58}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* crystal facet light grid */}

      <mesh
        position={[0, 0.885, 0]}
      >
        <sphereGeometry
          args={[
            1.735,
            20,
            12,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />

        <meshStandardMaterial
          color="#d8c6e8"
          emissive="#9f47dc"
          emissiveIntensity={1.35}
          transparent
          opacity={0.22}
          wireframe
          depthWrite={false}
          roughness={0.12}
        />
      </mesh>

      {/* metal ribs around glass */}

      {Array.from({
        length: 8,
      }).map((_, index) => {
        const angle =
          (index / 8) *
          Math.PI *
          2;

        return (
          <mesh
            key={index}
            position={[
              Math.sin(angle) * 1.19,
              1.28,
              Math.cos(angle) * 1.19,
            ]}
            rotation={[
              0,
              angle,
              Math.PI / 4.35,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                0.035,
                0.055,
                1.98,
                8,
              ]}
            />

            <meshStandardMaterial
              color="#8997aa"
              metalness={0.95}
              roughness={0.2}
            />
          </mesh>
        );
      })}

      {/* horizontal armored crown */}

      <mesh
        position={[0, 1.78, 0]}
      >
        <cylinderGeometry
          args={[
            0.88,
            1.12,
            0.26,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#303b4c"
          metalness={0.9}
          roughness={0.24}
        />
      </mesh>

      {/* living crystal inside dome */}

      <CrystalCore />

      {/* ===============================================
          FRONT COMMAND ENTRANCE
          =============================================== */}

      <RoundedBox
        args={[
          1.18,
          0.65,
          1.05,
        ]}
        radius={0.12}
        smoothness={5}
        position={[
          0,
          0.48,
          2.22,
        ]}
        castShadow
      >
        <meshStandardMaterial
          color="#202936"
          metalness={0.82}
          roughness={0.31}
        />
      </RoundedBox>

      {/* glowing door */}

      <RoundedBox
        args={[
          0.42,
          0.42,
          0.055,
        ]}
        radius={0.06}
        smoothness={4}
        position={[
          0,
          0.48,
          2.765,
        ]}
      >
        <meshStandardMaterial
          color="#e6bbff"
          emissive="#9e32ff"
          emissiveIntensity={3.1}
          roughness={0.08}
        />
      </RoundedBox>

      {/* ===============================================
          SIDE OPERATIONS MODULES
          =============================================== */}

      {[
        [-2.45, 0.5, 0.58, 0.12],
        [2.45, 0.5, 0.58, -0.12],
        [-1.85, 0.48, -1.55, -0.18],
        [1.85, 0.48, -1.55, 0.18],
      ].map(
        (
          [
            x,
            y,
            z,
            rotationY,
          ],
          index,
        ) => (
          <group
            key={index}
            position={[
              x,
              y,
              z,
            ]}
            rotation={[
              0,
              rotationY,
              0,
            ]}
          >
            <RoundedBox
              args={[
                1.55,
                0.62,
                1.18,
              ]}
              radius={0.12}
              smoothness={4}
              castShadow
            >
              <meshStandardMaterial
                color="#283240"
                metalness={0.8}
                roughness={0.32}
              />
            </RoundedBox>

            {/* purple window strip */}

            <RoundedBox
              args={[
                0.83,
                0.13,
                0.05,
              ]}
              radius={0.035}
              smoothness={3}
              position={[
                0,
                0.03,
                0.61,
              ]}
            >
              <meshStandardMaterial
                color="#d8a8ff"
                emissive="#9635ff"
                emissiveIntensity={2}
                roughness={0.08}
              />
            </RoundedBox>
          </group>
        ),
      )}

      {/* ===============================================
          FOUR EXTERNAL CRYSTAL STABILIZERS
          =============================================== */}

      {[
        [-2.75, 0.72, 1.85],
        [2.75, 0.72, 1.85],
        [-2.55, 0.72, -1.95],
        [2.55, 0.72, -1.95],
      ].map(
        (
          [x, y, z],
          index,
        ) => (
          <group
            key={index}
            position={[x, y, z]}
          >
            <mesh
              position={[0, -0.4, 0]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  0.32,
                  0.43,
                  0.42,
                  10,
                ]}
              />

              <meshStandardMaterial
                color="#252d39"
                metalness={0.84}
                roughness={0.3}
              />
            </mesh>

            <mesh castShadow>
              <octahedronGeometry
                args={[0.38, 0]}
              />

              <meshPhysicalMaterial
                color="#d49cff"
                emissive="#9d30ff"
                emissiveIntensity={2.7}
                transmission={0.28}
                thickness={0.25}
                roughness={0.05}
                transparent
                opacity={0.9}
              />
            </mesh>

            <pointLight
              color="#a33dff"
              intensity={1.6}
              distance={2.2}
              decay={2}
            />
          </group>
        ),
      )}

      {/* ===============================================
          LEVEL 1 COMMUNICATIONS MAST
          =============================================== */}

      <mesh
        position={[
          0,
          2.42,
          -0.18,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.11,
            0.21,
            1.02,
            10,
          ]}
        />

        <meshStandardMaterial
          color="#a7b3c2"
          metalness={0.94}
          roughness={0.18}
        />
      </mesh>

      <group
        ref={radar}
        position={[
          0,
          2.79,
          -0.18,
        ]}
      >
        {/* compact radar dish */}

        <mesh
          rotation={[
            Math.PI / 2.65,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.58,
              0.1,
              0.1,
              30,
            ]}
          />

          <meshStandardMaterial
            color="#aab7c8"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        <mesh
          position={[0, 0.38, 0]}
        >
          <octahedronGeometry
            args={[0.1, 0]}
          />

          <meshStandardMaterial
            ref={beaconMaterial}
            color="#f0d4ff"
            emissive="#bb4cff"
            emissiveIntensity={4}
            roughness={0.05}
          />
        </mesh>
      </group>

      {/* ===============================================
          WARM OPERATION LIGHTS
          =============================================== */}

      {[
        [-2.9, 0.3, 1.2],
        [-1.65, 0.29, 2.48],
        [1.65, 0.29, 2.48],
        [2.9, 0.3, 1.2],
        [-2.2, 0.29, -2.2],
        [2.2, 0.29, -2.2],
      ].map(
        (
          [x, y, z],
          index,
        ) => (
          <mesh
            key={index}
            position={[x, y, z]}
          >
            <sphereGeometry
              args={[
                0.055,
                12,
                12,
              ]}
            />

            <meshStandardMaterial
              color="#ffd8a6"
              emissive={warm}
              emissiveIntensity={2.8}
            />
          </mesh>
        ),
      )}

      {/* crystal light spills into building */}

      <pointLight
        position={[0, 1.38, 0]}
        color="#bd46ff"
        intensity={15}
        distance={5.6}
        decay={2}
      />

      <pointLight
        position={[0, 1.78, 0]}
        color="#f2cfff"
        intensity={5.8}
        distance={3.2}
        decay={2}
      />

      <pointLight
        position={[0, 0.8, 2]}
        color="#d18bff"
        intensity={3}
        distance={3.8}
        decay={2}
      />
    </group>
  );
}

function CommandHubModel({
  level,
}: Props) {
  /*
   * Level 1 is the canonical BOBU architecture.
   * Future hardware layers attach here:
   *
   * L2 = Power Array
   * L3 = Advanced Comms
   * L4 = AI Operations Core
   * L5 = Deep Space Array
   *
   * Do not fake higher-level production state here.
   * building_level remains server authoritative.
   */
  return (
    <>
      <CommandHubLevelOne />

      {level >= 2 && (
        <group
          visible={false}
          name="future-level-2-power-array"
        />
      )}

      {level >= 3 && (
        <group
          visible={false}
          name="future-level-3-comms"
        />
      )}

      {level >= 4 && (
        <group
          visible={false}
          name="future-level-4-ai-core"
        />
      )}

      {level >= 5 && (
        <group
          visible={false}
          name="future-level-5-deep-space-array"
        />
      )}
    </>
  );
}

export function MarsCommandHub3D({
  level,
}: Props) {
  return (
    <div
      className="mars-command-hub-3d"
      aria-label={`Command Hub Level ${level}`}
    >
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: [
            7.4,
            7.8,
            8.5,
          ],
          zoom: 70,
          near: 0.1,
          far: 100,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference:
            "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace =
            THREE.SRGBColorSpace;

          gl.toneMapping =
            THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure =
            1.12;

          gl.setClearColor(
            0x000000,
            0,
          );
        }}
      >
        <ambientLight
          intensity={0.46}
          color="#8896ae"
        />

        <hemisphereLight
          intensity={0.82}
          color="#cbd8ee"
          groundColor="#5e2818"
        />

        {/* warm Mars sunlight */}

        <directionalLight
          castShadow
          position={[6, 9, 7]}
          intensity={3.6}
          color="#ffd4a6"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />

        {/* cool BOBU rim light */}

        <directionalLight
          position={[-5, 4, -4]}
          intensity={1.1}
          color="#7d48ff"
        />

        <CommandHubModel
          level={level}
        />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.7}
          scale={10}
          blur={2.2}
          far={7}
          resolution={512}
          color="#150b08"
        />
      </Canvas>
    </div>
  );
}

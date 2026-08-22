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

function CommandHubModel({
  level,
}: Props) {
  const coreMaterial =
    useRef<THREE.MeshStandardMaterial>(null);

  const beaconMaterial =
    useRef<THREE.MeshStandardMaterial>(null);

  const radar =
    useRef<THREE.Group>(null);

  const purple =
    useMemo(
      () => new THREE.Color("#a849ff"),
      [],
    );

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;

    if (coreMaterial.current) {
      coreMaterial.current.emissiveIntensity =
        2.3 +
        Math.sin(t * 2.4) * 0.85 +
        Math.sin(t * 0.7) * 0.3;
    }

    if (beaconMaterial.current) {
      beaconMaterial.current.emissiveIntensity =
        3.2 +
        Math.sin(t * 5.2) * 1.3;
    }

    if (radar.current) {
      radar.current.rotation.y +=
        delta * 0.58;
    }
  });

  const visibleWingCount =
    Math.max(
      1,
      Math.min(4, level),
    );

  return (
    <group
      rotation={[0, -0.18, 0]}
      position={[0, -0.15, 0]}
    >
      {/* =================================================
          FOUNDATION
          ================================================= */}

      <mesh
        position={[0, 0.08, 0]}
        receiveShadow
      >
        <cylinderGeometry
          args={[2.9, 3.15, 0.22, 8]}
        />

        <meshStandardMaterial
          color="#171c24"
          metalness={0.72}
          roughness={0.58}
        />
      </mesh>

      <mesh position={[0, 0.205, 0]}>
        <cylinderGeometry
          args={[2.58, 2.72, 0.08, 8]}
        />

        <meshStandardMaterial
          color="#2c3542"
          metalness={0.84}
          roughness={0.34}
        />
      </mesh>

      {/* Purple energy ring in foundation */}

      <mesh
        position={[0, 0.255, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry
          args={[2.12, 2.28, 48]}
        />

        <meshStandardMaterial
          color="#6c23bd"
          emissive={purple}
          emissiveIntensity={1.65}
          metalness={0.35}
          roughness={0.28}
        />
      </mesh>

      {/* =================================================
          CENTRAL ARMORED COMMAND CORE
          ================================================= */}

      <RoundedBox
        args={[2.8, 0.82, 1.75]}
        radius={0.18}
        smoothness={5}
        position={[0, 0.68, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#26303e"
          metalness={0.78}
          roughness={0.3}
        />
      </RoundedBox>

      {/* Sloped upper armor */}

      <mesh
        position={[0, 1.17, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[1.15, 1.48, 0.46, 8]}
        />

        <meshStandardMaterial
          color="#394657"
          metalness={0.82}
          roughness={0.27}
        />
      </mesh>

      {/* Living purple interior */}

      <RoundedBox
        args={[1.35, 0.34, 1.86]}
        radius={0.1}
        smoothness={4}
        position={[0, 0.76, 0]}
      >
        <meshStandardMaterial
          ref={coreMaterial}
          color="#56178c"
          emissive={purple}
          emissiveIntensity={2.8}
          metalness={0.2}
          roughness={0.18}
        />
      </RoundedBox>

      {/* Front observation window */}

      <RoundedBox
        args={[1.88, 0.23, 0.07]}
        radius={0.07}
        smoothness={4}
        position={[
          0,
          0.82,
          0.913,
        ]}
      >
        <meshStandardMaterial
          color="#c78cff"
          emissive="#a741ff"
          emissiveIntensity={2.6}
          metalness={0.15}
          roughness={0.12}
        />
      </RoundedBox>

      {/* =================================================
          SIDE OPERATIONS WINGS
          ================================================= */}

      {visibleWingCount >= 1 && (
        <>
          <RoundedBox
            args={[1.78, 0.62, 1.25]}
            radius={0.13}
            smoothness={4}
            position={[
              -2.15,
              0.52,
              0.12,
            ]}
            rotation={[
              0,
              0.13,
              0,
            ]}
            castShadow
          >
            <meshStandardMaterial
              color="#313b49"
              metalness={0.76}
              roughness={0.34}
            />
          </RoundedBox>

          <RoundedBox
            args={[1.78, 0.62, 1.25]}
            radius={0.13}
            smoothness={4}
            position={[
              2.15,
              0.52,
              0.12,
            ]}
            rotation={[
              0,
              -0.13,
              0,
            ]}
            castShadow
          >
            <meshStandardMaterial
              color="#313b49"
              metalness={0.76}
              roughness={0.34}
            />
          </RoundedBox>
        </>
      )}

      {/* Side window strips */}

      {[-2.15, 2.15].map(
        (x) => (
          <RoundedBox
            key={x}
            args={[
              0.95,
              0.13,
              0.05,
            ]}
            radius={0.04}
            smoothness={3}
            position={[
              x,
              0.57,
              0.765,
            ]}
          >
            <meshStandardMaterial
              color="#d5a7ff"
              emissive="#9d3cff"
              emissiveIntensity={1.9}
              roughness={0.14}
            />
          </RoundedBox>
        ),
      )}

      {/* =================================================
          LEVEL-BASED EXPANSION MODULES
          ================================================= */}

      {visibleWingCount >= 2 && (
        <>
          <mesh
            position={[
              -2.58,
              0.58,
              -0.95,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                0.48,
                0.6,
                0.78,
                8,
              ]}
            />

            <meshStandardMaterial
              color="#26303d"
              metalness={0.76}
              roughness={0.33}
            />
          </mesh>

          <mesh
            position={[
              2.58,
              0.58,
              -0.95,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                0.48,
                0.6,
                0.78,
                8,
              ]}
            />

            <meshStandardMaterial
              color="#26303d"
              metalness={0.76}
              roughness={0.33}
            />
          </mesh>
        </>
      )}

      {/* =================================================
          COMMUNICATION TOWER
          ================================================= */}

      <mesh
        position={[0, 1.75, -0.1]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.13,
            0.23,
            1.22,
            8,
          ]}
        />

        <meshStandardMaterial
          color="#aab4c3"
          metalness={0.92}
          roughness={0.2}
        />
      </mesh>

      <group
        ref={radar}
        position={[0, 2.18, -0.1]}
      >
        <mesh
          rotation={[
            Math.PI / 2.55,
            0,
            0,
          ]}
          castShadow
        >
          <cylinderGeometry
            args={[
              0.67,
              0.12,
              0.12,
              28,
            ]}
          />

          <meshStandardMaterial
            color="#9faaba"
            metalness={0.9}
            roughness={0.22}
          />
        </mesh>

        <mesh
          position={[0, 0.39, 0]}
        >
          <sphereGeometry
            args={[0.09, 16, 16]}
          />

          <meshStandardMaterial
            ref={beaconMaterial}
            color="#f0cbff"
            emissive="#b34cff"
            emissiveIntensity={4}
            roughness={0.08}
          />
        </mesh>
      </group>

      {/* =================================================
          SMALL EXTERIOR OPERATION LIGHTS
          ================================================= */}

      {[
        [-2.55, 0.32, 1.15],
        [-1.55, 0.3, 1.63],
        [1.55, 0.3, 1.63],
        [2.55, 0.32, 1.15],
      ].map(
        ([x, y, z], index) => (
          <mesh
            key={index}
            position={[x, y, z]}
          >
            <sphereGeometry
              args={[0.065, 12, 12]}
            />

            <meshStandardMaterial
              color="#ffe1b6"
              emissive="#ff9f52"
              emissiveIntensity={2.4}
            />
          </mesh>
        ),
      )}

      {/* Subtle local purple light */}

      <pointLight
        position={[0, 1.3, 0.7]}
        intensity={5.5}
        distance={5}
        decay={2}
        color="#a23dff"
      />
    </group>
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
            6.2,
            6.6,
            7.6,
          ],
          zoom: 78,
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
            1.18;

          gl.setClearColor(
            0x000000,
            0,
          );
        }}
      >
        <ambientLight
          intensity={0.7}
          color="#8f9db5"
        />

        <hemisphereLight
          intensity={1.05}
          color="#d6e4ff"
          groundColor="#512315"
        />

        <directionalLight
          castShadow
          position={[5, 8, 7]}
          intensity={3.4}
          color="#ffe1c2"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
        />

        <directionalLight
          position={[-5, 3, -4]}
          intensity={1.25}
          color="#7440ff"
        />

        <CommandHubModel
          level={level}
        />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.62}
          scale={9}
          blur={2.1}
          far={6}
          resolution={512}
          color="#120b09"
        />
      </Canvas>
    </div>
  );
}

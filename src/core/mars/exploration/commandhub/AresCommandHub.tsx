import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Html,
  useGLTF,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";


import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
} from "../engine/AresGenesisTerrainData";

import {
  ARES_COMMAND_HUB_DEPTH,
  ARES_COMMAND_HUB_POSITION,
  ARES_COMMAND_HUB_WIDTH,
} from "./AresCommandHubCollision";

import {
  AresMissionTerminal,
} from "../missions/AresMissionTerminal";
import {
  AresResearchTerminal,
} from "../research/AresResearchTerminal";
import {
  AresCommandHubUpgradeTerminal,
} from "./AresCommandHubUpgradeTerminal";

import type {
  AresHiddenMission,
} from "../missions/AresHiddenMissionService";

import type {
  AresDiscoveryRecord,
} from "../research/AresDiscoveryArchiveService";

type Props = {
  targetRef:
    React.RefObject<THREE.Group | null>;

  onMission:
    (
      mission:
        AresHiddenMission,
    ) => void;

  mission:
    AresHiddenMission | null;

  onArchiveOpenChange?: (
    open: boolean,
  ) => void;

  onArchiveRecordChange?: (
    record: AresDiscoveryRecord | null,
  ) => void;
};

type MarsModuleProps = {
  path: string;
  position: [
    number,
    number,
    number,
  ];
  rotation?: [
    number,
    number,
    number,
  ];
  scale?: number;
};









function MarsModule({
  path,
  position,
  rotation = [
    0,
    0,
    0,
  ],
  scale = 1,
}: MarsModuleProps) {
  const {
    scene,
  } = useGLTF(
    path,
  );

  const model =
    useMemo(
      () => {
        const clone =
          scene.clone(
            true,
          );

        clone.traverse(
          (
            child,
          ) => {
            if (
              child instanceof
              THREE.Mesh
            ) {
              child.castShadow =
                true;

              child.receiveShadow =
                true;
            }
          },
        );

        return clone;
      },
      [
        scene,
      ],
    );

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function BobuEnergyCore() {
  const coreRef =
    useRef<THREE.Group | null>(
      null,
    );

  const outerRef =
    useRef<THREE.MeshPhysicalMaterial | null>(
      null,
    );

  const innerRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  useFrame(
    ({
      clock,
    }) => {
      const t =
        clock.elapsedTime;

      if (
        coreRef.current
      ) {
        coreRef.current.rotation.y =
          t * 0.3;

        const pulse =
          1 +
          Math.sin(
            t *
              2.2,
          ) *
            0.025;

        coreRef.current.scale.setScalar(
          pulse,
        );
      }

      if (
        outerRef.current
      ) {
        outerRef.current.emissiveIntensity =
          0.9 +
          Math.sin(
            t *
              2,
          ) *
            0.15;
      }

      if (
        innerRef.current
      ) {
        innerRef.current.emissiveIntensity =
          2 +
          Math.sin(
            t *
              2.5,
          ) *
            0.35;
      }
    },
  );

  return (
    <group
      ref={coreRef}
      position={[
        -2.5,
        1.25,
        -1.4,
      ]}
    >
      <mesh
        castShadow
      >
        <octahedronGeometry
          args={[
            0.46,
            1,
          ]}
        />

        <meshPhysicalMaterial
          ref={
            outerRef
          }
          color="#bd82f3"
          emissive="#7830af"
          emissiveIntensity={0.9}
          transparent
          opacity={0.76}
          transmission={0.05}
          thickness={0.1}
          roughness={0.16}
        />
      </mesh>

      <mesh
        scale={0.54}
      >
        <icosahedronGeometry
          args={[
            0.55,
            2,
          ]}
        />

        <meshStandardMaterial
          ref={
            innerRef
          }
          color="#ddbeff"
          emissive="#9344d4"
          emissiveIntensity={2}
          roughness={0.1}
        />
      </mesh>

      <mesh
        position={[
          0,
          -0.75,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.18,
            0.48,
            0.75,
            10,
          ]}
        />

        <meshStandardMaterial
          color="#b9bec6"
          metalness={0.72}
          roughness={0.32}
        />
      </mesh>

      <pointLight
        color="#9843d5"
        intensity={2.8}
        distance={6}
        decay={2}
      />
    </group>
  );
}


function CommandInterior({
  targetRef,
  onMission,
  mission,
  onArchiveOpenChange,
  onArchiveRecordChange,
}: Props) {
  return (
    <group>
      <mesh
        position={[
          0,
          -0.04,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            15.2,
            0.1,
            17.2,
          ]}
        />

        <meshStandardMaterial
          color="#8e929a"
          metalness={0.3}
          roughness={0.64}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.35,
          -8.55,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            15.4,
            4.7,
            0.25,
          ]}
        />

        <meshStandardMaterial
          color="#c6cad0"
          metalness={0.55}
          roughness={0.43}
        />
      </mesh>

      <mesh
        position={[
          -7.6,
          2.35,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.25,
            4.7,
            17.2,
          ]}
        />

        <meshStandardMaterial
          color="#c3c7ce"
          metalness={0.55}
          roughness={0.43}
        />
      </mesh>

      <mesh
        position={[
          7.6,
          2.35,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.25,
            4.7,
            17.2,
          ]}
        />

        <meshStandardMaterial
          color="#c3c7ce"
          metalness={0.55}
          roughness={0.43}
        />
      </mesh>

      <mesh
        position={[
          -7.42,
          2.45,
          2.2,
        ]}
      >
        <boxGeometry
          args={[
            0.04,
            1.15,
            2.8,
          ]}
        />

        <meshStandardMaterial
          color="#8146b7"
          emissive="#57237d"
          emissiveIntensity={0.55}
        />
      </mesh>

      <mesh
        position={[
          7.42,
          2.45,
          2.2,
        ]}
      >
        <boxGeometry
          args={[
            0.04,
            1.15,
            2.8,
          ]}
        />

        <meshStandardMaterial
          color="#8146b7"
          emissive="#57237d"
          emissiveIntensity={0.55}
        />
      </mesh>

      <BobuEnergyCore />

      <AresMissionTerminal
        targetRef={targetRef}
        worldPosition={{
          x:
            ARES_COMMAND_HUB_POSITION.x,
          z:
            ARES_COMMAND_HUB_POSITION.z -
            3.7,
        }}
        onMission={onMission}
      />

      <AresCommandHubUpgradeTerminal
        targetRef={targetRef}
      />

      <AresResearchTerminal
        targetRef={targetRef}
        mission={mission}
        onArchiveOpenChange={
          onArchiveOpenChange
        }
        onArchiveRecordChange={
          onArchiveRecordChange
        }
        worldPosition={{
          x:
            ARES_COMMAND_HUB_POSITION.x -
            2.65,
          z:
            ARES_COMMAND_HUB_POSITION.z +
            1.55,
        }}
      />

      <pointLight
        position={[
          0,
          2.3,
          2.8,
        ]}
        color="#ffd9c3"
        intensity={4.2}
        distance={12}
        decay={2}
      />

      <pointLight
        position={[
          0,
          2,
          -3.5,
        ]}
        color="#8277d0"
        intensity={3.4}
        distance={9}
        decay={2}
      />

      <pointLight
        position={[
          -2.5,
          1.6,
          -1,
        ]}
        color="#9849cf"
        intensity={2.2}
        distance={6}
        decay={2}
      />
    </group>
  );
}


function CommandHubRoofSystems() {
  const radarRef =
    useRef<THREE.Group | null>(
      null,
    );

  const redBeaconRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  const amberBeaconRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  const panelRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  useFrame(
    ({
      clock,
    }, delta) => {
      const t =
        clock.elapsedTime;

      if (
        radarRef.current
      ) {
        radarRef.current.rotation.y +=
          delta * 0.62;
      }

      if (
        redBeaconRef.current
      ) {
        const pulse =
          Math.sin(
            t * 5.8,
          ) >
          0.55
            ? 4.5
            : 0.35;

        redBeaconRef.current.emissiveIntensity =
          pulse;
      }

      if (
        amberBeaconRef.current
      ) {
        amberBeaconRef.current.emissiveIntensity =
          1.1 +
          (
            Math.sin(
              t * 3.1,
            ) +
            1
          ) *
            0.85;
      }

      if (
        panelRef.current
      ) {
        panelRef.current.emissiveIntensity =
          0.8 +
          (
            Math.sin(
              t * 1.7,
            ) +
            1
          ) *
            0.22;
      }
    },
  );

  return (
    <group>
      <group
        position={[
          0,
          4.25,
          -0.5,
        ]}
      >
        <mesh
          castShadow
        >
          <cylinderGeometry
            args={[
              0.5,
              0.72,
              0.62,
              12,
            ]}
          />

          <meshStandardMaterial
            color="#363942"
            metalness={0.78}
            roughness={0.3}
          />
        </mesh>

        <group
          ref={radarRef}
          position={[
            0,
            0.72,
            0,
          ]}
        >
          <mesh
            rotation={[
              Math.PI /
                2.7,
              0,
              0,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                0.95,
                0.95,
                0.08,
                32,
              ]}
            />

            <meshStandardMaterial
              color="#4b4652"
              metalness={0.8}
              roughness={0.28}
            />
          </mesh>

          <mesh
            rotation={[
              Math.PI /
                2.7,
              0,
              0,
            ]}
            position={[
              0,
              0.03,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.7,
                0.035,
                10,
                44,
              ]}
            />

            <meshStandardMaterial
              color="#9c59cf"
              emissive="#6e3294"
              emissiveIntensity={1.15}
            />
          </mesh>

          <mesh
            position={[
              0,
              0.18,
              0,
            ]}
          >
            <sphereGeometry
              args={[
                0.13,
                16,
                16,
              ]}
            />

            <meshStandardMaterial
              color="#d8b8ed"
              emissive="#9f54cf"
              emissiveIntensity={2.1}
            />
          </mesh>
        </group>
      </group>

      <group
        position={[
          -4.3,
          3.6,
          -2.8,
        ]}
      >
        <mesh
          position={[
            0,
            0.7,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.035,
              0.06,
              1.4,
              8,
            ]}
          />

          <meshStandardMaterial
            color="#55545c"
            metalness={0.82}
            roughness={0.26}
          />
        </mesh>

        <mesh
          position={[
            0,
            1.45,
            0,
          ]}
        >
          <sphereGeometry
            args={[
              0.09,
              12,
              12,
            ]}
          />

          <meshStandardMaterial
            ref={
              redBeaconRef
            }
            color="#ff5a4c"
            emissive="#ff2419"
            emissiveIntensity={4.5}
            toneMapped={false}
          />
        </mesh>

        <pointLight
          position={[
            0,
            1.45,
            0,
          ]}
          color="#ff3328"
          intensity={1.8}
          distance={5}
          decay={2}
        />
      </group>

      <group
        position={[
          4.15,
          3.45,
          -2.4,
        ]}
      >
        <mesh
          position={[
            0,
            0.62,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.035,
              0.06,
              1.25,
              8,
            ]}
          />

          <meshStandardMaterial
            color="#56565e"
            metalness={0.82}
            roughness={0.26}
          />
        </mesh>

        <mesh
          position={[
            0,
            1.31,
            0,
          ]}
        >
          <sphereGeometry
            args={[
              0.08,
              12,
              12,
            ]}
          />

          <meshStandardMaterial
            ref={
              amberBeaconRef
            }
            color="#ffb36b"
            emissive="#ff7e31"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group
        position={[
          0,
          3.35,
          5.95,
        ]}
      >
        <mesh>
          <boxGeometry
            args={[
              3.15,
              0.58,
              0.12,
            ]}
          />

          <meshStandardMaterial
            color="#aeb3bb"
            metalness={0.72}
            roughness={0.32}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            0.065,
          ]}
        >
          <planeGeometry
            args={[
              2.75,
              0.28,
            ]}
          />

          <meshStandardMaterial
            ref={
              panelRef
            }
            color="#7d49ae"
            emissive="#63308e"
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>

        {[
          -1.05,
          -0.7,
          -0.35,
          0,
          0.35,
          0.7,
          1.05,
        ].map(
          (
            x,
            index,
          ) => (
            <mesh
              key={x}
              position={[
                x,
                0,
                0.075,
              ]}
            >
              <boxGeometry
                args={[
                  0.15,
                  0.08,
                  0.02,
                ]}
              />

              <meshBasicMaterial
                color={
                  index %
                    3 ===
                  0
                    ? "#f3d6ff"
                    : "#b96be8"
                }
              />
            </mesh>
          ),
        )}

        <Html
          center
          position={[
            0,
            0.52,
            0.1,
          ]}
          distanceFactor={8}
          style={{
            pointerEvents:
              "none",
            whiteSpace:
              "nowrap",
            color:
              "#e5dcff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            fontSize:
              "8px",
            fontWeight:
              900,
            letterSpacing:
              "0.18em",
          }}
        >
          ARES SYSTEMS
        </Html>
      </group>
    </group>
  );
}

function BobuCommandFlag() {
  const flagRef =
    useRef<THREE.Mesh | null>(
      null,
    );

  const texture =
    useMemo(
      () =>
        new THREE.TextureLoader().load(
          "/images/bobu/bobu-app-icon.png",
        ),
      [],
    );

  useEffect(() => {
    texture.colorSpace =
      THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(
    ({
      clock,
    }) => {
      const mesh =
        flagRef.current;

      if (!mesh) {
        return;
      }

      const geometry =
        mesh.geometry as THREE.PlaneGeometry;

      const position =
        geometry.attributes.position;

      const time =
        clock.elapsedTime;

      for (
        let index = 0;
        index < position.count;
        index += 1
      ) {
        const x =
          position.getX(index);

        const y =
          position.getY(index);

        const normalized =
          THREE.MathUtils.clamp(
            (x + 1.9) / 3.8,
            0,
            1,
          );

        const primary =
          Math.sin(
            time * 2 +
              x * 2.8 +
              y * 1.35,
          ) *
          0.24 *
          normalized;

        const secondary =
          Math.sin(
            time * 1.25 +
              x * 5.1,
          ) *
          0.09 *
          normalized;

        position.setZ(
          index,
          primary +
            secondary,
        );
      }

      position.needsUpdate =
        true;

      geometry.computeVertexNormals();
    },
  );

  return (
    <group
      position={[
        0,
        4.75,
        0.8,
      ]}
    >
      <mesh
        position={[
          0,
          2.9,
          0,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.07,
            0.1,
            5.8,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#e7e9ee"
          emissive="#59606b"
          emissiveIntensity={0.18}
          metalness={0.95}
          roughness={0.13}
        />
      </mesh>

      <mesh
        position={[
          0,
          5.86,
          0,
        ]}
      >
        <sphereGeometry
          args={[
            0.14,
            18,
            18,
          ]}
        />

        <meshStandardMaterial
          color="#e0a5ff"
          emissive="#b64fff"
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={flagRef}
        position={[
          1.95,
          4.75,
          0,
        ]}
        castShadow
      >
        <planeGeometry
          args={[
            3.8,
            2.15,
            38,
            20,
          ]}
        />

        <meshPhysicalMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#63329a"
          emissiveIntensity={0.72}
          color="#ffffff"
          roughness={0.28}
          metalness={0.02}
          clearcoat={0.32}
          clearcoatRoughness={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      <pointLight
        position={[
          1.4,
          4.8,
          0.4,
        ]}
        color="#ae55ff"
        intensity={3.2}
        distance={9}
        decay={2}
      />
    </group>
  );
}

function CommandHubRadarArray() {
  const rotatingRef =
    useRef<THREE.Group | null>(
      null,
    );

  useFrame(
    ({
      clock,
    }) => {
      if (
        rotatingRef.current
      ) {
        rotatingRef.current.rotation.y =
          clock.elapsedTime *
          0.38;
      }
    },
  );

  return (
    <group
      position={[
        0,
        4.9,
        -2.4,
      ]}
    >
      <mesh
        position={[
          0,
          0.72,
          0,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.38,
            0.62,
            1.45,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#bfc4cc"
          emissive="#3a3e47"
          emissiveIntensity={0.2}
          metalness={0.94}
          roughness={0.17}
        />
      </mesh>

      <group
        ref={rotatingRef}
        position={[
          0,
          1.65,
          0,
        ]}
      >
        <group
          rotation={[
            -0.3,
            0,
            0,
          ]}
        >
          <mesh>
            <circleGeometry
              args={[
                2.15,
                40,
              ]}
            />

            <meshPhysicalMaterial
              color="#a763db"
              emissive="#8d36d1"
              emissiveIntensity={1.7}
              metalness={0.72}
              roughness={0.15}
              clearcoat={1}
              clearcoatRoughness={0.08}
              side={THREE.DoubleSide}
            />
          </mesh>

          <mesh
            position={[
              0,
              0,
              0.04,
            ]}
          >
            <ringGeometry
              args={[
                1.82,
                2.16,
                40,
              ]}
            />

            <meshBasicMaterial
              color="#e0a2ff"
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          <mesh
            position={[
              0,
              0,
              0.1,
            ]}
          >
            <sphereGeometry
              args={[
                0.28,
                20,
                20,
              ]}
            />

            <meshStandardMaterial
              color="#ffffff"
              emissive="#d47cff"
              emissiveIntensity={6}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      <pointLight
        position={[
          0,
          1.9,
          0,
        ]}
        color="#c35cff"
        intensity={5}
        distance={14}
        decay={2}
      />
    </group>
  );
}

function CommandShipShell() {
  const landingLegs = [
    [-7.95, -7.65],
    [7.95, -7.65],
    [-7.95, 7.65],
    [7.95, 7.65],
  ] as const;

  const sideWindows = [
    [-7.45, 2.65, -4.8],
    [-7.45, 2.65, -1.6],
    [-7.45, 2.65, 1.7],
    [-7.45, 2.65, 4.8],
    [7.45, 2.65, -4.8],
    [7.45, 2.65, -1.6],
    [7.45, 2.65, 1.7],
    [7.45, 2.65, 4.8],
  ] as const;

  return (
    <group>
      {landingLegs.map(([x, z]) => (
        <group
          key={`${x}-${z}`}
          position={[x, 0, z]}
        >
          <mesh
            position={[0, 0.95, 0]}
            rotation={[
              0,
              0,
              x < 0 ? -0.18 : 0.18,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                0.34,
                0.5,
                1.75,
                12,
              ]}
            />

            <meshStandardMaterial
              color="#aeb4bd"
              emissive="#333842"
              emissiveIntensity={0.15}
              metalness={0.92}
              roughness={0.2}
            />
          </mesh>

          <mesh
            position={[
              x < 0 ? -0.48 : 0.48,
              0.14,
              0,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                1.02,
                1.18,
                0.26,
                16,
              ]}
            />

            <meshPhysicalMaterial
              color="#d5d9df"
              metalness={0.88}
              roughness={0.22}
              clearcoat={0.8}
            />
          </mesh>

          <mesh
            position={[
              x < 0 ? -0.48 : 0.48,
              0.3,
              0,
            ]}
            rotation={[
              -Math.PI / 2,
              0,
              0,
            ]}
          >
            <ringGeometry
              args={[
                0.54,
                0.78,
                24,
              ]}
            />

            <meshBasicMaterial
              color="#9d48d2"
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      <mesh
        position={[0, 4.55, -0.15]}
        scale={[1, 1, 1.12]}
        castShadow
      >
        <cylinderGeometry
          args={[
            8.15,
            7.7,
            0.7,
            8,
          ]}
        />

        <meshPhysicalMaterial
          color="#d8dce2"
          emissive="#4b5058"
          emissiveIntensity={0.16}
          metalness={0.92}
          roughness={0.17}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      <mesh
        position={[0, 4.96, -0.7]}
        scale={[1, 1, 1.08]}
        castShadow
      >
        <cylinderGeometry
          args={[
            6.65,
            6.25,
            0.42,
            8,
          ]}
        />

        <meshPhysicalMaterial
          color="#f0f1f4"
          emissive="#555b64"
          emissiveIntensity={0.12}
          metalness={0.9}
          roughness={0.13}
          clearcoat={1}
          clearcoatRoughness={0.06}
        />
      </mesh>

      <mesh
        position={[-7.45, 2.55, 0]}
        castShadow
      >
        <boxGeometry
          args={[
            0.34,
            4.2,
            13.8,
          ]}
        />

        <meshPhysicalMaterial
          color="#c8cdd4"
          emissive="#434851"
          emissiveIntensity={0.22}
          metalness={0.9}
          roughness={0.18}
          clearcoat={0.9}
        />
      </mesh>

      <mesh
        position={[7.45, 2.55, 0]}
        castShadow
      >
        <boxGeometry
          args={[
            0.34,
            4.2,
            13.8,
          ]}
        />

        <meshPhysicalMaterial
          color="#c8cdd4"
          emissive="#434851"
          emissiveIntensity={0.22}
          metalness={0.9}
          roughness={0.18}
          clearcoat={0.9}
        />
      </mesh>

      {sideWindows.map(([x, y, z]) => (
        <mesh
          key={`${x}-${z}`}
          position={[x, y, z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry
            args={[
              2.5,
              1.45,
            ]}
          />

          <meshPhysicalMaterial
            color="#6d899b"
            emissive="#173f53"
            emissiveIntensity={0.42}
            transparent
            opacity={0.66}
            transmission={0.26}
            roughness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.04}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh
        position={[0, 2.65, -8.35]}
      >
        <planeGeometry
          args={[
            10.4,
            1.7,
          ]}
        />

        <meshPhysicalMaterial
          color="#66899e"
          emissive="#173f55"
          emissiveIntensity={0.38}
          transparent
          opacity={0.68}
          transmission={0.26}
          roughness={0.05}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, 4.88, 5.8]}
        rotation={[0.22, 0, 0]}
      >
        <boxGeometry
          args={[
            8.4,
            0.18,
            2.4,
          ]}
        />

        <meshStandardMaterial
          color="#c4c9d0"
          emissive="#53316c"
          emissiveIntensity={0.28}
          metalness={0.88}
          roughness={0.18}
        />
      </mesh>

      <mesh
        position={[0, 5.12, 3.8]}
      >
        <boxGeometry
          args={[
            5.8,
            0.08,
            5.4,
          ]}
        />

        <meshStandardMaterial
          color="#9e50d2"
          emissive="#752ba8"
          emissiveIntensity={1.25}
          toneMapped={false}
        />
      </mesh>

      <CommandHubRadarArray />
      <BobuCommandFlag />
    </group>
  );
}

function ExteriorFacility() {
  return (
    <group>
      <CommandShipShell />

      <mesh
        position={[
          0,
          0.03,
          7.15,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            4.6,
            0.12,
            3.6,
          ]}
        />

        <meshPhysicalMaterial
          color="#cdd2d9"
          metalness={0.86}
          roughness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
        />
      </mesh>

      <mesh
        position={[
          -2.15,
          1.55,
          7,
        ]}
        rotation={[
          0,
          0,
          -0.16,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            0.38,
            3.25,
            1.45,
          ]}
        />

        <meshPhysicalMaterial
          color="#c5cad2"
          metalness={0.9}
          roughness={0.17}
          clearcoat={0.92}
        />
      </mesh>

      <mesh
        position={[
          2.15,
          1.55,
          7,
        ]}
        rotation={[
          0,
          0,
          0.16,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            0.38,
            3.25,
            1.45,
          ]}
        />

        <meshPhysicalMaterial
          color="#c5cad2"
          metalness={0.9}
          roughness={0.17}
          clearcoat={0.92}
        />
      </mesh>

      <mesh
        position={[
          0,
          3.02,
          7,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            4.5,
            0.32,
            1.45,
          ]}
        />

        <meshPhysicalMaterial
          color="#d9dde3"
          metalness={0.9}
          roughness={0.15}
          clearcoat={1}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.62,
          7.76,
        ]}
      >
        <boxGeometry
          args={[
            3.45,
            0.08,
            0.1,
          ]}
        />

        <meshStandardMaterial
          color="#dca4ff"
          emissive="#9e43df"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        position={[
          0,
          2.4,
          7.1,
        ]}
        color="#bd62ff"
        intensity={4}
        distance={9}
        decay={2}
      />

      <Html
        center
        position={[
          0,
          3.55,
          7.45,
        ]}
        distanceFactor={8}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          color:
            "#f1e7ff",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize:
            "9px",
          fontWeight:
            900,
          letterSpacing:
            "0.2em",
          textShadow:
            "0 0 12px rgba(173,78,236,.9)",
        }}
      >
        COMMAND ACCESS
      </Html>
    </group>
  );
}

export function AresCommandHub({
  targetRef,
  onMission,
  mission,
  onArchiveOpenChange,
  onArchiveRecordChange,
}: Props) {
  const [
    terrainHeight,
    setTerrainHeight,
  ] = useState(0);

  const [
    inside,
    setInside,
  ] = useState(false);

  const insideRef =
    useRef(false);

  useEffect(() => {
    let active = true;

    loadAresGenesisTerrainData()
      .then(
        (
          terrain,
        ) => {
          if (
            !active
          ) {
            return;
          }

          setTerrainHeight(
            sampleAresGenesisGameplaySurfaceMeters(
              terrain,
              ARES_COMMAND_HUB_POSITION.x,
              ARES_COMMAND_HUB_POSITION.z,
            ),
          );
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "Failed to place Ares Command Hub",
            error,
          );
        },
      );

    return () => {
      active = false;
    };
  }, []);

  useFrame(() => {
    const target =
      targetRef.current;

    if (!target) {
      return;
    }

    const dx =
      target.position.x -
      ARES_COMMAND_HUB_POSITION.x;

    const dz =
      target.position.z -
      ARES_COMMAND_HUB_POSITION.z;

    const isInside =
      Math.abs(dx) <
        ARES_COMMAND_HUB_WIDTH /
          2 -
          0.35 &&
      Math.abs(dz) <
        ARES_COMMAND_HUB_DEPTH /
          2 -
          0.35;

    if (
      isInside ===
      insideRef.current
    ) {
      return;
    }

    insideRef.current =
      isInside;

    setInside(
      isInside,
    );
  });

  return (
    <group
      position={[
        ARES_COMMAND_HUB_POSITION.x,
        terrainHeight +
          0.05,
        ARES_COMMAND_HUB_POSITION.z,
      ]}
    >
      <mesh
        position={[
          0,
          -0.1,
          0,
        ]}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            7.35,
            7.65,
            0.18,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#432d26"
          metalness={0.34}
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.01,
          0,
        ]}
        rotation={[
          -Math.PI /
            2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            6.6,
            6.85,
            64,
          ]}
        />

        <meshStandardMaterial
          color="#8345ad"
          emissive="#552274"
          emissiveIntensity={0.55}
        />
      </mesh>

      <ExteriorFacility />

      <group
        position={[
          0,
          0,
          6.18,
        ]}
      >
        <mesh
          position={[
            -1.65,
            1.55,
            0,
          ]}
        >
          <boxGeometry
            args={[
              0.12,
              3.1,
              0.12,
            ]}
          />
          <meshStandardMaterial
            color="#c777ff"
            emissive="#8d36d1"
            emissiveIntensity={3.2}
            toneMapped={false}
          />
        </mesh>

        <mesh
          position={[
            1.65,
            1.55,
            0,
          ]}
        >
          <boxGeometry
            args={[
              0.12,
              3.1,
              0.12,
            ]}
          />
          <meshStandardMaterial
            color="#c777ff"
            emissive="#8d36d1"
            emissiveIntensity={3.2}
            toneMapped={false}
          />
        </mesh>

        <mesh
          position={[
            0,
            3.05,
            0,
          ]}
        >
          <boxGeometry
            args={[
              3.42,
              0.13,
              0.13,
            ]}
          />
          <meshStandardMaterial
            color="#d39aff"
            emissive="#943bd7"
            emissiveIntensity={3.4}
            toneMapped={false}
          />
        </mesh>

        <pointLight
          position={[
            0,
            2.1,
            0.55,
          ]}
          color="#a64de5"
          intensity={5}
          distance={8}
          decay={2}
        />

        <Html
          center
          position={[
            0,
            3.55,
            0.05,
          ]}
          distanceFactor={7}
          style={{
            pointerEvents:
              "none",
            whiteSpace:
              "nowrap",
            padding:
              "7px 13px",
            border:
              "1px solid rgba(91,255,145,.88)",
            borderRadius:
              "8px",
            background:
              "rgba(5,22,12,.94)",
            boxShadow:
              "0 0 18px rgba(70,255,125,.62)",
            color:
              "#8dffad",
            fontFamily:
              "Inter, system-ui, sans-serif",
            fontSize:
              "9px",
            fontWeight:
              900,
            letterSpacing:
              "0.2em",
          }}
        >
          COMMAND ENTRY
        </Html>

        {[
          -1.05,
          0,
          1.05,
        ].map(
          (
            x,
          ) => (
            <mesh
              key={
                x
              }
              position={[
                x,
                0.025,
                1.25,
              ]}
              rotation={[
                -Math.PI /
                  2,
                0,
                0,
              ]}
            >
              <planeGeometry
                args={[
                  0.16,
                  2.2,
                ]}
              />
              <meshBasicMaterial
                color="#54ff88"
                transparent
                opacity={0.82}
                toneMapped={false}
                side={
                  THREE.DoubleSide
                }
              />
            </mesh>
          ),
        )}

        <Html
          center
          position={[
            0,
            0.12,
            2.35,
          ]}
          rotation={[
            -Math.PI /
              2,
            0,
            0,
          ]}
          distanceFactor={5}
          style={{
            pointerEvents:
              "none",
            whiteSpace:
              "nowrap",
            color:
              "#d9a6ff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            fontSize:
              "8px",
            fontWeight:
              900,
            letterSpacing:
              "0.18em",
            textShadow:
              "0 0 10px #8d36d1",
          }}
        >
          ▲ ENTER
        </Html>
      </group>

      <CommandInterior
        targetRef={targetRef}
        onMission={onMission}
        mission={mission}
        onArchiveOpenChange={
          onArchiveOpenChange
        }
        onArchiveRecordChange={
          onArchiveRecordChange
        }
      />

      <Html
        center
        position={[
          0,
          4.8,
          1.5,
        ]}
        distanceFactor={12}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          padding:
            "6px 10px",
          border:
            "1px solid rgba(150,95,195,.38)",
          borderRadius:
            "999px",
          background:
            "rgba(8,8,14,.78)",
          color:
            "#fff",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize:
            "9px",
          fontWeight:
            900,
          letterSpacing:
            "0.18em",
        }}
      >
        ARES COMMAND HUB
      </Html>
    </group>
  );
}

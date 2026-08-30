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

import type {
  AresHiddenMission,
} from "../missions/AresHiddenMissionService";

type Props = {
  targetRef:
    React.RefObject<THREE.Group | null>;

  onMission:
    (
      mission:
        AresHiddenMission,
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

const BASE_A =
  "/models/mars/buildings/kaykit/basemodule_A.gltf";

const BASE_B =
  "/models/mars/buildings/kaykit/basemodule_B.gltf";

const BASE_C =
  "/models/mars/buildings/kaykit/basemodule_C.gltf";

const BASE_D =
  "/models/mars/buildings/kaykit/basemodule_D.gltf";

const BASE_E =
  "/models/mars/buildings/kaykit/basemodule_E.gltf";

const STRUCTURE_TALL =
  "/models/mars/buildings/kaykit/structure_tall.gltf";

const STRUCTURE_LOW =
  "/models/mars/buildings/kaykit/structure_low.gltf";

const LIGHTS =
  "/models/mars/buildings/kaykit/lights.gltf";

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
          color="#30323a"
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
            10.1,
            0.1,
            11.8,
          ]}
        />

        <meshStandardMaterial
          color="#342c2b"
          metalness={0.3}
          roughness={0.64}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.55,
          -5.9,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            10.3,
            3.1,
            0.25,
          ]}
        />

        <meshStandardMaterial
          color="#252830"
          metalness={0.55}
          roughness={0.43}
        />
      </mesh>

      <mesh
        position={[
          -5.02,
          1.55,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.25,
            3.1,
            11.8,
          ]}
        />

        <meshStandardMaterial
          color="#292c34"
          metalness={0.55}
          roughness={0.43}
        />
      </mesh>

      <mesh
        position={[
          5.02,
          1.55,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.25,
            3.1,
            11.8,
          ]}
        />

        <meshStandardMaterial
          color="#292c34"
          metalness={0.55}
          roughness={0.43}
        />
      </mesh>

      <mesh
        position={[
          -4.88,
          1.8,
          1.8,
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
          4.88,
          1.8,
          1.8,
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
            color="#171820"
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

function ExteriorFacility() {
  return (
    <group>
      <MarsModule
        path={BASE_A}
        position={[
          -3.55,
          0,
          0,
        ]}
        rotation={[
          0,
          Math.PI /
            2,
          0,
        ]}
        scale={2.35}
      />

      <MarsModule
        path={BASE_B}
        position={[
          3.55,
          0,
          0,
        ]}
        rotation={[
          0,
          -Math.PI /
            2,
          0,
        ]}
        scale={2.35}
      />

      <MarsModule
        path={BASE_C}
        position={[
          0,
          0,
          -4.2,
        ]}
        rotation={[
          0,
          Math.PI,
          0,
        ]}
        scale={2.15}
      />

      <MarsModule
        path={BASE_D}
        position={[
          -3.45,
          0,
          -4,
        ]}
        rotation={[
          0,
          Math.PI /
            2,
          0,
        ]}
        scale={1.9}
      />

      <MarsModule
        path={BASE_E}
        position={[
          3.25,
          0,
          -3.8,
        ]}
        rotation={[
          0,
          -Math.PI /
            2,
          0,
        ]}
        scale={1.75}
      />

      <MarsModule
        path={
          STRUCTURE_LOW
        }
        position={[
          -5.3,
          0,
          -3.8,
        ]}
        scale={1.5}
      />

      <MarsModule
        path={
          STRUCTURE_TALL
        }
        position={[
          4.8,
          0,
          -4,
        ]}
        scale={1.35}
      />

      <MarsModule
        path={LIGHTS}
        position={[
          -4.6,
          0,
          4,
        ]}
        scale={1.5}
      />

      <MarsModule
        path={LIGHTS}
        position={[
          4.6,
          0,
          4,
        ]}
        rotation={[
          0,
          Math.PI,
          0,
        ]}
        scale={1.5}
      />

      <CommandHubRoofSystems />

      <mesh
        position={[
          0,
          0.03,
          6,
        ]}
      >
        <boxGeometry
          args={[
            3.4,
            0.08,
            2.4,
          ]}
        />

        <meshStandardMaterial
          color="#363940"
          metalness={0.58}
          roughness={0.4}
        />
      </mesh>

      <mesh
        position={[
          -1.65,
          1.4,
          5.8,
        ]}
      >
        <boxGeometry
          args={[
            0.3,
            2.8,
            1,
          ]}
        />

        <meshStandardMaterial
          color="#252830"
          metalness={0.7}
          roughness={0.34}
        />
      </mesh>

      <mesh
        position={[
          1.65,
          1.4,
          5.8,
        ]}
      >
        <boxGeometry
          args={[
            0.3,
            2.8,
            1,
          ]}
        />

        <meshStandardMaterial
          color="#252830"
          metalness={0.7}
          roughness={0.34}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.72,
          5.8,
        ]}
      >
        <boxGeometry
          args={[
            3.6,
            0.3,
            1,
          ]}
        />

        <meshStandardMaterial
          color="#252830"
          metalness={0.7}
          roughness={0.34}
        />
      </mesh>

      <mesh
        position={[
          0,
          2.5,
          6.32,
        ]}
      >
        <boxGeometry
          args={[
            2.8,
            0.07,
            0.08,
          ]}
        />

        <meshStandardMaterial
          color="#a057d0"
          emissive="#75369c"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>

      <Html
        center
        position={[
          0,
          3.18,
          6.25,
        ]}
        distanceFactor={8}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          color:
            "#e7ddff",
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
        COMMAND ACCESS
      </Html>
    </group>
  );
}

export function AresCommandHub({
  targetRef,
  onMission,
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

useGLTF.preload(
  BASE_A,
);

useGLTF.preload(
  BASE_B,
);

useGLTF.preload(
  BASE_C,
);

useGLTF.preload(
  BASE_D,
);

useGLTF.preload(
  BASE_E,
);

useGLTF.preload(
  STRUCTURE_LOW,
);

useGLTF.preload(
  STRUCTURE_TALL,
);

useGLTF.preload(
  LIGHTS,
);

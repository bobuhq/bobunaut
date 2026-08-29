import {
  useRef,
} from "react";

import {
  Html,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
} from "../engine/AresGenesisTerrainData";

import type {
  AresHiddenMission,
} from "./AresHiddenMissionService";

import {
  useEffect,
  useState,
} from "react";

type Props = {
  mission:
    AresHiddenMission;
};

export function AresHiddenMissionBeacon({
  mission,
}: Props) {
  const [
    terrainHeight,
    setTerrainHeight,
  ] = useState(0);

  const ringRef =
    useRef<THREE.Group | null>(
      null,
    );

  const beamRef =
    useRef<THREE.MeshBasicMaterial | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    loadAresGenesisTerrainData()
      .then(
        (
          terrain,
        ) => {
          if (!active) {
            return;
          }

          setTerrainHeight(
            sampleAresGenesisGameplaySurfaceMeters(
              terrain,
              mission.targetX,
              mission.targetZ,
            ),
          );
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "Failed to place hidden mission beacon",
            error,
          );
        },
      );

    return () => {
      active = false;
    };
  }, [
    mission.targetX,
    mission.targetZ,
  ]);

  useFrame(
    ({
      clock,
    }, delta) => {
      const t =
        clock.elapsedTime;

      if (
        ringRef.current
      ) {
        ringRef.current.rotation.y +=
          delta * 0.8;

        ringRef.current.position.y =
          1.5 +
          Math.sin(
            t * 2,
          ) *
            0.12;
      }

      if (
        beamRef.current
      ) {
        beamRef.current.opacity =
          0.18 +
          (
            Math.sin(
              t * 2.4,
            ) +
            1
          ) *
            0.07;
      }
    },
  );

  return (
    <group
      position={[
        mission.targetX,
        terrainHeight +
          0.08,
        mission.targetZ,
      ]}
    >
      <mesh
        position={[
          0,
          0.03,
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
            1.6,
            1.9,
            48,
          ]}
        />

        <meshStandardMaterial
          color="#9653d8"
          emissive="#64289d"
          emissiveIntensity={1.4}
          transparent
          opacity={0.8}
        />
      </mesh>

      <group
        ref={
          ringRef
        }
        position={[
          0,
          1.5,
          0,
        ]}
      >
        <mesh
          rotation={[
            Math.PI /
              2,
            0,
            0,
          ]}
        >
          <torusGeometry
            args={[
              0.62,
              0.045,
              10,
              40,
            ]}
          />

          <meshStandardMaterial
            color="#c48aff"
            emissive="#8e42d2"
            emissiveIntensity={2}
          />
        </mesh>

        <mesh>
          <octahedronGeometry
            args={[
              0.25,
              0,
            ]}
          />

          <meshStandardMaterial
            color="#e0c1ff"
            emissive="#a34fe8"
            emissiveIntensity={2.6}
          />
        </mesh>
      </group>

      <mesh
        position={[
          0,
          5,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.04,
            0.35,
            10,
            12,
            1,
            true,
          ]}
        />

        <meshBasicMaterial
          ref={
            beamRef
          }
          color="#a95de8"
          transparent
          opacity={0.22}
          depthWrite={false}
          side={
            THREE.DoubleSide
          }
        />
      </mesh>

      <Html
        center
        position={[
          0,
          2.75,
          0,
        ]}
        distanceFactor={9}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          padding:
            "6px 9px",
          border:
            "1px solid rgba(180,110,235,.4)",
          borderRadius:
            "999px",
          background:
            "rgba(8,7,15,.8)",
          color:
            "#eadfff",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize:
            "8px",
          fontWeight:
            900,
          letterSpacing:
            "0.16em",
        }}
      >
        MISSION SIGNAL
      </Html>
    </group>
  );
}

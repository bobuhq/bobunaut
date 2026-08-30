import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

const DUST_PATCH_COUNT = 18;
const DUST_RADIUS = 72;

type DustPatch = {
  x: number;
  z: number;
  scaleX: number;
  scaleZ: number;
  speed: number;
  opacity: number;
};

function seededRandom(
  seed: number,
) {
  const value =
    Math.sin(
      seed * 91.731,
    ) * 43758.5453;

  return (
    value -
    Math.floor(value)
  );
}

function GroundDustPatch({
  patch,
  terrain,
}: {
  patch: DustPatch;
  terrain: AresGenesisTerrainData;
}) {
  const meshRef =
    useRef<THREE.Mesh | null>(
      null,
    );

  const baseY =
    useMemo(
      () =>
        sampleAresGenesisGameplaySurfaceMeters(
          terrain,
          patch.x,
          patch.z,
        ) + 0.08,
      [
        terrain,
        patch.x,
        patch.z,
      ],
    );

  useFrame(
    (
      _state,
      delta,
    ) => {
      const mesh =
        meshRef.current;

      if (!mesh) {
        return;
      }

      mesh.position.x +=
        patch.speed *
        delta;

      if (
        mesh.position.x >
        DUST_RADIUS
      ) {
        mesh.position.x =
          -DUST_RADIUS;

        mesh.position.y =
          sampleAresGenesisGameplaySurfaceMeters(
            terrain,
            mesh.position.x,
            mesh.position.z,
          ) + 0.08;
      }
    },
  );

  return (
    <mesh
      ref={meshRef}
      position={[
        patch.x,
        baseY,
        patch.z,
      ]}
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
      scale={[
        patch.scaleX,
        patch.scaleZ,
        1,
      ]}
      renderOrder={1}
    >
      <planeGeometry
        args={[
          1,
          1,
        ]}
      />

      <meshBasicMaterial
        color="#9b4d32"
        transparent
        opacity={
          patch.opacity
        }
        depthWrite={false}
        side={
          THREE.DoubleSide
        }
        blending={
          THREE.NormalBlending
        }
        toneMapped
      />
    </mesh>
  );
}

export function AresGroundDust() {
  const [
    terrain,
    setTerrain,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

  const patches =
    useMemo<DustPatch[]>(
      () =>
        Array.from(
          {
            length:
              DUST_PATCH_COUNT,
          },
          (
            _,
            index,
          ) => {
            const angle =
              seededRandom(
                index + 13,
              ) *
              Math.PI *
              2;

            const radius =
              14 +
              seededRandom(
                index + 31,
              ) *
                58;

            return {
              x:
                Math.cos(
                  angle,
                ) *
                radius,

              z:
                Math.sin(
                  angle,
                ) *
                radius,

              scaleX:
                5 +
                seededRandom(
                  index + 53,
                ) *
                  11,

              scaleZ:
                0.45 +
                seededRandom(
                  index + 71,
                ) *
                  1.1,

              speed:
                0.16 +
                seededRandom(
                  index + 89,
                ) *
                  0.34,

              opacity:
                0.018 +
                seededRandom(
                  index + 107,
                ) *
                  0.025,
            };
          },
        ),
      [],
    );

  useEffect(() => {
    let active =
      true;

    loadAresGenesisTerrainData()
      .then(
        (
          loadedTerrain,
        ) => {
          if (
            active
          ) {
            setTerrain(
              loadedTerrain,
            );
          }
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "Failed to initialize Ares ground dust",
            error,
          );
        },
      );

    return () => {
      active =
        false;
    };
  }, []);

  if (!terrain) {
    return null;
  }

  return (
    <>
      {patches.map(
        (
          patch,
          index,
        ) => (
          <GroundDustPatch
            key={index}
            patch={patch}
            terrain={terrain}
          />
        ),
      )}
    </>
  );
}

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

const ROCK_COUNT = 850;
const ROCK_RADIUS_METERS = 520;
const LARGE_ROCK_COLLISION_THRESHOLD = 0.9;

type MarsRockDescriptor = {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
};

export type MarsRockCollisionObstacle = {
  x: number;
  z: number;
  radius: number;
};

function createRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value =
      (value * 1664525 + 1013904223) >>>
      0;

    return value / 4294967296;
  };
}

function createMarsRockDescriptors(): MarsRockDescriptor[] {
  const random =
    createRandom(0x41524553);

  const rocks:
    MarsRockDescriptor[] = [];

  for (
    let index = 0;
    index < ROCK_COUNT;
    index += 1
  ) {
    const angle =
      random() *
      Math.PI *
      2;

    const radial =
      Math.sqrt(random()) *
      ROCK_RADIUS_METERS;

    const x =
      Math.cos(angle) *
      radial;

    const z =
      Math.sin(angle) *
      radial;

    if (
      Math.hypot(x, z) <
      5
    ) {
      continue;
    }

    const sizeBias =
      Math.pow(
        random(),
        2.2,
      );

    const size =
      0.08 +
      sizeBias *
        3.8;

    const width =
      size *
      (
        0.8 +
        random() *
          1.35
      );

    const height =
      size *
      (
        0.28 +
        random() *
          0.52
      );

    const depth =
      size *
      (
        0.75 +
        random() *
          1.25
      );

    const rotationX =
      (random() - 0.5) *
      0.5;

    const rotationY =
      random() *
      Math.PI *
      2;

    const rotationZ =
      (random() - 0.5) *
      0.5;

    rocks.push({
      x,
      z,
      width,
      height,
      depth,
      rotationX,
      rotationY,
      rotationZ,
    });
  }

  return rocks;
}

const MARS_ROCK_DESCRIPTORS =
  createMarsRockDescriptors();

export const MARS_SURFACE_ROCK_COLLISION_OBSTACLES:
  MarsRockCollisionObstacle[] =
  MARS_ROCK_DESCRIPTORS
    .filter((rock) => {
      const footprint =
        Math.max(
          rock.width,
          rock.depth,
        );

      return (
        footprint >=
        LARGE_ROCK_COLLISION_THRESHOLD
      );
    })
    .map((rock) => ({
      x: rock.x,
      z: rock.z,
      radius:
        Math.max(
          rock.width,
          rock.depth,
        ) * 0.72,
    }));

export function MarsSurfaceRocks() {
  const meshRef =
    useRef<THREE.InstancedMesh | null>(
      null,
    );

  const [
    terrainData,
    setTerrainData,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    loadAresGenesisTerrainData()
      .then((terrain) => {
        if (active) {
          setTerrainData(terrain);
        }
      })
      .catch((error) => {
        console.error(
          "Failed to initialize Mars surface rocks",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const transforms =
    useMemo(() => {
      if (!terrainData) {
        return [];
      }

      const dummy =
        new THREE.Object3D();

      return MARS_ROCK_DESCRIPTORS.map(
        (rock) => {
          const terrainY =
            sampleAresGenesisGameplaySurfaceMeters(
              terrainData,
              rock.x,
              rock.z,
            );

          dummy.position.set(
            rock.x,
            terrainY +
              rock.height *
                0.36,
            rock.z,
          );

          dummy.rotation.set(
            rock.rotationX,
            rock.rotationY,
            rock.rotationZ,
          );

          dummy.scale.set(
            rock.width,
            rock.height,
            rock.depth,
          );

          dummy.updateMatrix();

          return dummy.matrix.clone();
        },
      );
    }, [
      terrainData,
    ]);

  useEffect(() => {
    const mesh =
      meshRef.current;

    if (!mesh) {
      return;
    }

    transforms.forEach(
      (
        matrix,
        index,
      ) => {
        mesh.setMatrixAt(
          index,
          matrix,
        );
      },
    );

    mesh.count =
      transforms.length;

    mesh.instanceMatrix.needsUpdate =
      true;

    mesh.computeBoundingSphere();
  }, [
    transforms,
  ]);

  if (!terrainData) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        undefined,
        undefined,
        ROCK_COUNT,
      ]}
      castShadow
      receiveShadow
    >
      <icosahedronGeometry
        args={[
          1,
          0,
        ]}
      />

      <meshStandardMaterial
        color="#9a4a27"
        roughness={0.96}
        metalness={0}
      />
    </instancedMesh>
  );
}

import {
  useGLTF,
} from "@react-three/drei";

import { useMemo } from "react";

import * as THREE from "three";

import type {
  MarsBuildingInstance,
} from "../types/MarsBuildingInstance";

import {
  marsGridToWorld,
} from "../engine";


type Props = {
  buildings: MarsBuildingInstance[];
};


type PropDefinition = {
  path: string;

  position: [
    number,
    number,
    number,
  ];

  rotationY?: number;

  scale?: number;
};


const BASE =
  "/models/mars/buildings/kaykit";


function getBuildingWorld(
  building: MarsBuildingInstance,
) {
  const rotated =
    building.rotationY === 90 ||
    building.rotationY === 270;

  const width =
    rotated
      ? building.footprintDepth
      : building.footprintWidth;

  const depth =
    rotated
      ? building.footprintWidth
      : building.footprintDepth;

  return marsGridToWorld(
    building.gridX,
    building.gridZ,
    width,
    depth,
  );
}


function DensityAsset({
  path,
  position,
  rotationY = 0,
  scale = 1,
}: PropDefinition) {
  const gltf =
    useGLTF(
      `${BASE}/${path}`,
    );

  const scene = useMemo(
    () => gltf.scene.clone(true),
    [gltf.scene],
  );

  /*
   * Density props are secondary colony geometry.
   *
   * Real structures own dynamic shadows. Auxiliary visual
   * mass uses global lighting only so it remains cheap.
   */
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh
    ) {
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
    }
  });

  return (
    <primitive
      object={scene}
      position={position}
      rotation={[
        0,
        THREE.MathUtils.degToRad(
          rotationY,
        ),
        0,
      ]}
      scale={scale}
    />
  );
}


function HubDistrict() {
  const props: PropDefinition[] = [
    {
      path: "landingpad_large.gltf",
      position: [-4.6, 0, 2.8],
      rotationY: 12,
      scale: 0.82,
    },

    {
      path: "cargodepot_A.gltf",
      position: [4.0, 0, 2.4],
      rotationY: -18,
      scale: 0.82,
    },

    {
      path: "containers_A.gltf",
      position: [4.7, 0, 0.4],
      rotationY: 90,
      scale: 0.72,
    },

    {
      path: "containers_A.gltf",
      position: [3.9, 0, -0.6],
      rotationY: 0,
      scale: 0.68,
    },

    {
      path: "structure_low.gltf",
      position: [-3.7, 0, -2.4],
      rotationY: 20,
      scale: 0.72,
    },

    {
      path: "lights.gltf",
      position: [-2.6, 0, 2.2],
      rotationY: 30,
      scale: 0.7,
    },

    {
      path: "lights.gltf",
      position: [2.5, 0, 2.1],
      rotationY: -30,
      scale: 0.7,
    },
  ];

  return (
    <>
      {props.map(
        (prop, index) => (
          <DensityAsset
            key={`hub-density:${index}`}
            {...prop}
          />
        ),
      )}
    </>
  );
}


function CrystalShard({
  position,
  scale = 1,
  rotationY = 0,
}: {
  position: [
    number,
    number,
    number,
  ];
  scale?: number;
  rotationY?: number;
}) {
  return (
    <group
      position={position}
      rotation={[
        0,
        THREE.MathUtils.degToRad(
          rotationY,
        ),
        0,
      ]}
      scale={scale}
    >
      <mesh
        castShadow
        position={[0, 0.42, 0]}
      >
        <octahedronGeometry
          args={[0.34, 0]}
        />

        <meshStandardMaterial
          color="#c66cff"
          emissive="#7516d1"
          emissiveIntensity={2.7}
          metalness={0.28}
          roughness={0.18}
        />
      </mesh>

      <mesh
        position={[0, 0.12, 0]}
      >
        <cylinderGeometry
          args={[
            0.28,
            0.42,
            0.18,
            8,
          ]}
        />

        <meshStandardMaterial
          color="#211926"
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>

    </group>
  );
}


function EnergyDistrict() {
  const supportProps:
  PropDefinition[] = [
    {
      path: "structure_low.gltf",
      position: [1.85, 0, 1.25],
      rotationY: 90,
      scale: 0.54,
    },

    {
      path: "containers_A.gltf",
      position: [-1.8, 0, 1.2],
      rotationY: 90,
      scale: 0.48,
    },

    {
      path: "lights.gltf",
      position: [0, 0, 1.85],
      scale: 0.52,
    },
  ];

  return (
    <group>
      {supportProps.map(
        (prop, index) => (
          <DensityAsset
            key={`energy-support:${index}`}
            {...prop}
          />
        ),
      )}

      <CrystalShard
        position={[-1.55, 0, -1.35]}
        scale={1.05}
        rotationY={18}
      />

      <CrystalShard
        position={[0, 0, -1.7]}
        scale={1.28}
      />

      <CrystalShard
        position={[1.55, 0, -1.35]}
        scale={1.05}
        rotationY={-18}
      />

      {/*
       * Shared district illumination.
       * Crystal emissive materials remain visual;
       * one real light serves the entire Energy district.
       */}
      <pointLight
        position={[0, 1.2, -0.8]}
        intensity={2.5}
        distance={5.5}
        decay={2}
        color="#ad4cff"
      />

      <CrystalShard
        position={[-0.9, 0, -0.55]}
        scale={0.72}
      />

      <CrystalShard
        position={[0.9, 0, -0.55]}
        scale={0.72}
      />

      <pointLight
        position={[0, 1.0, -1.0]}
        intensity={3.8}
        distance={6}
        color="#a93cff"
      />
    </group>
  );
}


function WaterDistrict() {
  const props: PropDefinition[] = [
    {
      path: "containers_A.gltf",
      position: [-2.4, 0, 1.7],
      rotationY: 90,
      scale: 0.7,
    },

    {
      path: "containers_A.gltf",
      position: [2.4, 0, 1.7],
      rotationY: 90,
      scale: 0.7,
    },

    {
      path: "structure_low.gltf",
      position: [0, 0, -2.5],
      rotationY: 0,
      scale: 0.74,
    },

    {
      path: "lights.gltf",
      position: [-2.1, 0, -1.3],
      rotationY: 35,
      scale: 0.65,
    },

    {
      path: "lights.gltf",
      position: [2.1, 0, -1.3],
      rotationY: -35,
      scale: 0.65,
    },
  ];

  return (
    <>
      {props.map(
        (prop, index) => (
          <DensityAsset
            key={`water-density:${index}`}
            {...prop}
          />
        ),
      )}
    </>
  );
}


function ScienceDistrict() {
  const props: PropDefinition[] = [
    {
      path: "structure_tall.gltf",
      position: [-2.8, 0, -1.6],
      rotationY: 8,
      scale: 0.72,
    },

    {
      path: "structure_low.gltf",
      position: [2.6, 0, -1.5],
      rotationY: -15,
      scale: 0.68,
    },

    {
      path: "containers_A.gltf",
      position: [2.5, 0, 1.6],
      rotationY: 90,
      scale: 0.55,
    },

    {
      path: "lights.gltf",
      position: [-2.2, 0, 1.7],
      rotationY: 25,
      scale: 0.65,
    },
  ];

  return (
    <>
      {props.map(
        (prop, index) => (
          <DensityAsset
            key={`science-density:${index}`}
            {...prop}
          />
        ),
      )}
    </>
  );
}


function HabitatDistrict() {
  const props: PropDefinition[] = [
    {
      path: "basemodule_E.gltf",
      position: [-2.7, 0, 0.5],
      rotationY: 15,
      scale: 0.7,
    },

    {
      path: "basemodule_E.gltf",
      position: [2.7, 0, 0.5],
      rotationY: -15,
      scale: 0.7,
    },

    {
      path: "structure_low.gltf",
      position: [0, 0, -2.5],
      scale: 0.62,
    },

    {
      path: "lights.gltf",
      position: [-1.8, 0, 2.0],
      rotationY: 30,
      scale: 0.62,
    },

    {
      path: "lights.gltf",
      position: [1.8, 0, 2.0],
      rotationY: -30,
      scale: 0.62,
    },
  ];

  return (
    <>
      {props.map(
        (prop, index) => (
          <DensityAsset
            key={`habitat-density:${index}`}
            {...prop}
          />
        ),
      )}
    </>
  );
}


function BuildingDistrict({
  building,
}: {
  building: MarsBuildingInstance;
}) {
  const world =
    getBuildingWorld(
      building,
    );

  const key =
    building.buildingKey
      .toLowerCase();

  const districtScale =
    key === "command_hub"
      ? 0.78
      : 0.84;

  return (
    <group
      position={[
        world.x,
        0,
        world.z,
      ]}
      rotation={[
        0,
        THREE.MathUtils.degToRad(
          building.rotationY,
        ),
        0,
      ]}
      scale={districtScale}
    >
      {key === "command_hub" && (
        <HubDistrict />
      )}

      {key.includes("energy") && (
        <EnergyDistrict />
      )}

      {key.includes("water") && (
        <WaterDistrict />
      )}

      {key.includes("science") && (
        <ScienceDistrict />
      )}

      {key.includes("habitat") && (
        <HabitatDistrict />
      )}
    </group>
  );
}


export default function MarsColonyDensityLayer({
  buildings,
}: Props) {
  return (
    <group
      name="mars-colony-density-layer"
    >
      {buildings.map(
        (building) => (
          <BuildingDistrict
            key={
              `density:${building.buildingId}`
            }
            building={building}
          />
        ),
      )}
    </group>
  );
}

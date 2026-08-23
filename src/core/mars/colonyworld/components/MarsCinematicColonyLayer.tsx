import {
  useGLTF,
} from "@react-three/drei";

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


const BASE =
  "/models/mars/buildings/kaykit";


type VisualAssetProps = {
  path: string;

  position: [
    number,
    number,
    number,
  ];

  rotationY?: number;

  scale?: number;
};


function VisualAsset({
  path,
  position,
  rotationY = 0,
  scale = 1,
}: VisualAssetProps) {
  const gltf =
    useGLTF(
      `${BASE}/${path}`,
    );

  const scene =
    gltf.scene.clone(true);

  /*
   * Cinematic city props deliberately do not participate in
   * dynamic shadow-map rendering.
   *
   * The primary gameplay structures keep real shadows.
   * Decorative city mass is lit by the global Mars lighting.
   * This prevents dozens of repeated GLTF meshes from
   * exhausting the WebGL shadow/render budget.
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


function getWorld(
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


function CityBuilding({
  x,
  z,
  index,
}: {
  x: number;
  z: number;
  index: number;
}) {
  const tall =
    index % 7 === 0;

  const medium =
    index % 3 === 0;

  const path =
    tall
      ? "structure_tall.gltf"
      : medium
        ? "basemodule_E.gltf"
        : "structure_low.gltf";

  const scale =
    tall
      ? 0.88
      : medium
        ? 0.7
        : 0.58;

  return (
    <group>
      <VisualAsset
        path={path}
        position={[x, 0, z]}
        rotationY={
          (index * 37) % 360
        }
        scale={scale}
      />

    </group>
  );
}


function RingRoad({
  radius,
}: {
  radius: number;
}) {
  return (
    <mesh
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
      position={[0, 0.028, 0]}
    >
      <ringGeometry
        args={[
          radius - 0.22,
          radius + 0.22,
          96,
        ]}
      />

      <meshStandardMaterial
        color="#241d1c"
        roughness={0.88}
        metalness={0.18}
      />
    </mesh>
  );
}


function RingLight({
  radius,
}: {
  radius: number;
}) {
  return (
    <mesh
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
      position={[0, 0.045, 0]}
    >
      <ringGeometry
        args={[
          radius - 0.025,
          radius + 0.025,
          96,
        ]}
      />

      <meshBasicMaterial
        color="#6c8cff"
        transparent
        opacity={0.68}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}


function CentralDistrict({
  x,
  z,
}: {
  x: number;
  z: number;
}) {
  const city: Array<{
    x: number;
    z: number;
  }> = [];

  const rings = [
    {
      radius: 4.2,
      count: 8,
    },
    {
      radius: 6.3,
      count: 12,
    },
    {
      radius: 8.7,
      count: 16,
    },
  ];

  for (
    const ring of rings
  ) {
    for (
      let i = 0;
      i < ring.count;
      i += 1
    ) {
      const angle =
        (
          i /
          ring.count
        ) *
        Math.PI *
        2;

      city.push({
        x:
          Math.cos(angle) *
          ring.radius,

        z:
          Math.sin(angle) *
          ring.radius,
      });
    }
  }

  return (
    <group
      position={[
        x,
        0,
        z,
      ]}
    >
      <RingRoad radius={3.2} />
      <RingRoad radius={5.3} />
      <RingRoad radius={7.6} />

      <RingLight radius={3.2} />
      <RingLight radius={5.3} />
      <RingLight radius={7.6} />

      {city.map(
        (
          position,
          index,
        ) => (
          <CityBuilding
            key={
              `city:${index}`
            }
            x={
              position.x
            }
            z={
              position.z
            }
            index={index}
          />
        ),
      )}

      <VisualAsset
        path="landingpad_large.gltf"
        position={[
          9.7,
          0,
          -3.2,
        ]}
        rotationY={18}
        scale={0.95}
      />

      <VisualAsset
        path="cargodepot_A.gltf"
        position={[
          -9.4,
          0,
          3.6,
        ]}
        rotationY={-22}
        scale={0.88}
      />

      <VisualAsset
        path="containers_A.gltf"
        position={[
          -8.4,
          0,
          5.1,
        ]}
        rotationY={90}
        scale={0.72}
      />

      <VisualAsset
        path="containers_A.gltf"
        position={[
          -9.8,
          0,
          5.0,
        ]}
        rotationY={0}
        scale={0.68}
      />

      <pointLight
        position={[
          0,
          7,
          0,
        ]}
        color="#708dff"
        intensity={5}
        distance={18}
      />
    </group>
  );
}


export default function MarsCinematicColonyLayer({
  buildings,
}: Props) {
  const commandHub =
    buildings.find(
      (building) =>
        building.buildingKey ===
        "command_hub",
    );

  if (!commandHub) {
    return null;
  }

  const world =
    getWorld(
      commandHub,
    );

  return (
    <group
      name="mars-cinematic-colony-layer"
    >
      <CentralDistrict
        x={world.x}
        z={world.z}
      />
    </group>
  );
}

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


function CrystalGlassShell({
  x,
  z,
  scale,
  tall,
}: {
  x: number;
  z: number;
  scale: number;
  tall: boolean;
}) {
  const shellHeight =
    tall
      ? 2.9 * scale
      : 1.65 * scale;

  const shellRadius =
    tall
      ? 0.72 * scale
      : 0.9 * scale;

  return (
    <group>
      {/*
       * Outer crystal-glass shell.
       * Transparent, non-shadow-casting and intentionally cheap.
       */}
      <mesh
        position={[
          x,
          shellHeight * 0.5,
          z,
        ]}
        scale={[
          shellRadius,
          shellHeight,
          shellRadius,
        ]}
        castShadow={false}
        receiveShadow={false}
      >
        <cylinderGeometry
          args={[
            0.82,
            0.98,
            1,
            tall ? 8 : 10,
            1,
            true,
          ]}
        />

        <meshPhysicalMaterial
          color={
            tall
              ? "#8a7dff"
              : "#b26cff"
          }
          transparent
          opacity={0.16}
          transmission={0.42}
          roughness={0.18}
          metalness={0.06}
          thickness={0.35}
          emissive={
            tall
              ? "#332a8f"
              : "#4b1f78"
          }
          emissiveIntensity={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/*
       * Internal illuminated core.
       */}
      <mesh
        position={[
          x,
          tall
            ? 1.25 * scale
            : 0.68 * scale,
          z,
        ]}
      >
        <cylinderGeometry
          args={[
            0.18 * scale,
            0.24 * scale,
            tall
              ? 1.9 * scale
              : 0.9 * scale,
            8,
          ]}
        />

        <meshStandardMaterial
          color="#ffd8b3"
          emissive="#ff8a3d"
          emissiveIntensity={
            tall ? 2.2 : 1.5
          }
          toneMapped={false}
          roughness={0.22}
          metalness={0.15}
        />
      </mesh>

      {/*
       * Vertical neon window strips.
       */}
      <mesh
        position={[
          x + shellRadius * 0.72,
          shellHeight * 0.52,
          z,
        ]}
      >
        <boxGeometry
          args={[
            0.035,
            shellHeight * 0.72,
            0.08,
          ]}
        />

        <meshBasicMaterial
          color="#8ec7ff"
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[
          x - shellRadius * 0.72,
          shellHeight * 0.52,
          z,
        ]}
      >
        <boxGeometry
          args={[
            0.035,
            shellHeight * 0.72,
            0.08,
          ]}
        />

        <meshBasicMaterial
          color="#c47aff"
          transparent
          opacity={0.78}
          toneMapped={false}
        />
      </mesh>
    </group>
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

      <CrystalGlassShell
        x={x}
        z={z}
        scale={scale}
        tall={tall}
      />
    </group>
  );
}


function SkylineTower({
  position,
  rotationY,
  scale,
  beaconColor,
}: {
  position: [number, number, number];
  rotationY: number;
  scale: number;
  beaconColor: string;
}) {
  return (
    <group>
      <VisualAsset
        path="structure_tall.gltf"
        position={position}
        rotationY={rotationY}
        scale={scale}
      />

      {/*
       * Lightweight emissive beacon.
       * No pointLight: glow stays cheap.
       */}
      <mesh
        position={[
          position[0],
          3.0 * scale,
          position[2],
        ]}
      >
        <sphereGeometry
          args={[0.11 * scale, 12, 12]}
        />

        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={2.8}
          toneMapped={false}
          roughness={0.2}
          metalness={0.25}
        />
      </mesh>
    </group>
  );
}


function CentralSkyline() {
  return (
    <group>
      {/*
       * Rear-half skyline.
       * Towers are intentionally placed behind the Command Hub
       * so they create depth without hiding the interactive hub.
       */}
      <SkylineTower
        position={[-4.9, 0, -5.8]}
        rotationY={-12}
        scale={1.45}
        beaconColor="#7f8dff"
      />

      <SkylineTower
        position={[0.2, 0, -7.0]}
        rotationY={7}
        scale={1.85}
        beaconColor="#c064ff"
      />

      <SkylineTower
        position={[5.1, 0, -5.5]}
        rotationY={18}
        scale={1.55}
        beaconColor="#64b8ff"
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

      <CentralSkyline />

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

  /*
   * Colony progression rule:
   *
   * Command Hub Level 1 is the initial settlement stage.
   * It must not visually appear as an already-developed city.
   *
   * The existing cinematic district remains intact and becomes
   * available from Command Hub Level 2 onward.
   *
   * commandHub.level comes from the authoritative Colony Base
   * server snapshot through MarsBuildingAdapter.
   */
  if (commandHub.level < 2) {
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

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


type WorldPoint = {
  x: number;
  z: number;
};


function getBuildingWorld(
  building: MarsBuildingInstance,
): WorldPoint {
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


function InfrastructureSegment({
  from,
  to,
}: {
  from: WorldPoint;
  to: WorldPoint;
}) {
  const dx =
    to.x - from.x;

  const dz =
    to.z - from.z;

  const length =
    Math.sqrt(
      dx * dx +
      dz * dz,
    );

  if (length < 0.05) {
    return null;
  }

  const centerX =
    (from.x + to.x) / 2;

  const centerZ =
    (from.z + to.z) / 2;

  const angle =
    Math.atan2(
      dz,
      dx,
    );

  return (
    <group>
      <mesh
        position={[
          centerX,
          0.035,
          centerZ,
        ]}
        rotation={[
          0,
          -angle,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            length,
            0.055,
            0.46,
          ]}
        />

        <meshStandardMaterial
          color="#2e2929"
          roughness={0.86}
          metalness={0.16}
        />
      </mesh>

      <mesh
        position={[
          centerX,
          0.071,
          centerZ,
        ]}
        rotation={[
          0,
          -angle,
          0,
        ]}
      >
        <boxGeometry
          args={[
            length * 0.96,
            0.022,
            0.055,
          ]}
        />

        <meshStandardMaterial
          color="#8c4cff"
          emissive="#5520aa"
          emissiveIntensity={1.4}
          roughness={0.42}
          metalness={0.25}
        />
      </mesh>
    </group>
  );
}


function ColonyRoad({
  from,
  to,
}: {
  from: WorldPoint;
  to: WorldPoint;
}) {
  const corner: WorldPoint = {
    x: to.x,
    z: from.z,
  };

  return (
    <>
      <InfrastructureSegment
        from={from}
        to={corner}
      />

      <InfrastructureSegment
        from={corner}
        to={to}
      />
    </>
  );
}


function BuildingPlatform({
  building,
}: {
  building: MarsBuildingInstance;
}) {
  const world =
    getBuildingWorld(
      building,
    );

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

  const radius =
    Math.max(
      1.15,
      Math.max(
        width,
        depth,
      ) * 0.88,
    );

  return (
    <group>
      <mesh
        position={[
          world.x,
          0.025,
          world.z,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        receiveShadow
      >
        <circleGeometry
          args={[
            radius,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#332a29"
          roughness={0.9}
          metalness={0.12}
        />
      </mesh>

      <mesh
        position={[
          world.x,
          0.052,
          world.z,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            radius * 0.82,
            radius * 0.9,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#8c4cff"
          emissive="#42106f"
          emissiveIntensity={1.5}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}


function RouteLights({
  from,
  to,
}: {
  from: WorldPoint;
  to: WorldPoint;
}) {
  const dx =
    to.x - from.x;

  const dz =
    to.z - from.z;

  const distance =
    Math.sqrt(
      dx * dx +
      dz * dz,
    );

  const count =
    Math.max(
      1,
      Math.floor(
        distance / 3.2,
      ),
    );

  return (
    <>
      {Array.from({
        length: count,
      }).map(
        (_, index) => {
          const t =
            (index + 1) /
            (count + 1);

          const x =
            from.x +
            dx * t;

          const z =
            from.z +
            dz * t;

          return (
            <group
              key={`${x}:${z}:${index}`}
              position={[
                x,
                0,
                z,
              ]}
            >
              <mesh
                position={[
                  0,
                  0.17,
                  0,
                ]}
              >
                <cylinderGeometry
                  args={[
                    0.035,
                    0.045,
                    0.34,
                    8,
                  ]}
                />

                <meshStandardMaterial
                  color="#242025"
                  metalness={0.72}
                  roughness={0.34}
                />
              </mesh>

              <mesh
                position={[
                  0,
                  0.38,
                  0,
                ]}
              >
                <sphereGeometry
                  args={[
                    0.065,
                    10,
                    10,
                  ]}
                />

                <meshStandardMaterial
                  color="#c999ff"
                  emissive="#7d29d8"
                  emissiveIntensity={2.2}
                />
              </mesh>
            </group>
          );
        },
      )}
    </>
  );
}


export default function MarsColonyInfrastructure({
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

  const hubWorld =
    getBuildingWorld(
      commandHub,
    );

  const colonyBuildings =
    buildings.filter(
      (building) =>
        building.buildingKey !==
        "command_hub",
    );

  return (
    <group
      name="mars-colony-infrastructure"
    >
      {buildings.map(
        (building) => (
          <BuildingPlatform
            key={
              `platform:${building.buildingId}`
            }
            building={building}
          />
        ),
      )}

      {colonyBuildings.map(
        (building) => {
          const target =
            getBuildingWorld(
              building,
            );

          return (
            <group
              key={
                `route:${building.buildingId}`
              }
            >
              <ColonyRoad
                from={hubWorld}
                to={target}
              />

              <RouteLights
                from={hubWorld}
                to={target}
              />
            </group>
          );
        },
      )}
    </group>
  );
}

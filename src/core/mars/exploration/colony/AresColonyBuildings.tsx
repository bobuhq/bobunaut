import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";

import {
  getMyMarsColonyBase,
  type MarsColonyBaseBuilding,
} from "../../MarsColonyBaseService";

import {
  createVerifiedMarsBuildingInstances,
} from "../../colonyworld/engine/MarsBuildingAdapter";

import MarsColonyBuildingModel from "../../colonyworld/models/MarsColonyBuildingModel";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

import {
  aresColonyGridToWorld,
} from "./AresColonyCoordinateSystem";

type Props = {
  refreshKey: number;
};

function supportsProductionVisual(
  buildingKey: string,
) {
  const key =
    buildingKey
      .trim()
      .toLowerCase();

  return (
    key.includes("energy") ||
    key.includes("water") ||
    key.includes("science") ||
    key.includes("habitat")
  );
}

export default function AresColonyBuildings({
  refreshKey,
}: Props) {
  const [
    buildings,
    setBuildings,
  ] =
    useState<MarsColonyBaseBuilding[]>(
      [],
    );

  const [
    terrain,
    setTerrain,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    Promise.all([
      getMyMarsColonyBase(),
      loadAresGenesisTerrainData(),
    ])
      .then(
        ([
          buildingRows,
          terrainData,
        ]) => {
          if (!active) {
            return;
          }

          setBuildings(
            buildingRows,
          );

          setTerrain(
            terrainData,
          );
        },
      )
      .catch((error) => {
        console.error(
          "Failed to load persistent Ares colony buildings",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const physicalBuildings =
    useMemo(
      () =>
        createVerifiedMarsBuildingInstances(
          buildings,
        ),
      [buildings],
    );

  if (!terrain) {
    return null;
  }

  return (
    <>
      {physicalBuildings.map(
        (building) => {
          const normalizedKey =
            building.buildingKey
              .trim()
              .toLowerCase();

          if (
            normalizedKey ===
              "command_hub" ||
            !supportsProductionVisual(
              normalizedKey,
            )
          ) {
            return null;
          }

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

          const world =
            aresColonyGridToWorld(
              building.gridX,
              building.gridZ,
              width,
              depth,
            );

          const worldX = world.x;
          const worldZ = world.z;

          const terrainY =
            sampleAresGenesisGameplaySurfaceMeters(
              terrain,
              worldX,
              worldZ,
            );

          return (
            <group
              key={
                building.buildingId
              }
              position={[
                worldX,
                terrainY + 0.05,
                worldZ,
              ]}
              rotation={[
                0,
                THREE.MathUtils.degToRad(
                  building.rotationY,
                ),
                0,
              ]}
            >
              <MarsColonyBuildingModel
                buildingKey={
                  building.buildingKey
                }
              />
            </group>
          );
        },
      )}
    </>
  );
}

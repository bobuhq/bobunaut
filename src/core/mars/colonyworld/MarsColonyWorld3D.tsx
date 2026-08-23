import {
  Canvas,
  type ThreeEvent,
} from "@react-three/fiber";

import {
  ContactShadows,
  Html,
} from "@react-three/drei";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";

import type {
  MarsColonyBaseBuilding,
  MarsColonyRotation,
} from "../MarsColonyBaseService";

import {
  placeMyMarsInventoryBuilding,
  type MarsInventoryItem,
} from "../MarsMarketService";

import type {
  MarsBuildingInstance,
} from "./types/MarsBuildingInstance";

import {
  createVerifiedMarsBuildingInstances,
  marsGridToWorld,
  marsWorldToGrid,
  MARS_GRID_MAX,
  MARS_GRID_MIN,
  MARS_GRID_UNIT,
  validateMarsPlacement,
} from "./engine";

import MarsPlacementGrid from "./components/MarsPlacementGrid";

import MarsCommandHubBuilding from "./components/MarsCommandHubBuilding";
import MarsInventoryBuildingPlacement from "./components/MarsInventoryBuildingPlacement";
import MarsPersistentColonyBuilding from "./components/MarsPersistentColonyBuilding";
import MarsColonyInfrastructure from "./components/MarsColonyInfrastructure";
import MarsPlacementPreview from "./components/MarsPlacementPreview";

import "./MarsColonyWorld3D.css";


type Props = {
  buildings: MarsColonyBaseBuilding[];
  canManageColony?: boolean;

  inventoryPlacementItem?: MarsInventoryItem | null;

  onCancelInventoryPlacement?: () => void;

  onInventoryPlacementSaved?: () =>
    void | Promise<void>;
};


type Placement = {
  gridX: number;
  gridZ: number;
  rotationY: MarsColonyRotation;
};

type MarsPhysicalBuildings =
  ReturnType<
    typeof createVerifiedMarsBuildingInstances
  >;

function ColonyScene({
  buildings,
  canManageColony,
  inventoryPlacementItem,
  onCancelInventoryPlacement,
  onInventoryPlacementSaved,
}: Props & {
  canManageColony: boolean;
}) {
  /*
   * Scene-authoritative UI selection.
   *
   * Placement remains server-authoritative; this state controls
   * only which physical building currently exposes its controls.
   * Exactly one building may be selected at a time.
   */
  const [
    selectedBuildingId,
    setSelectedBuildingId,
  ] = useState<string | null>(null);

  /*
   * One verified V3 physical snapshot for the whole scene.
   *
   * All placement systems read the exact same building
   * instances and occupancy source.
   */
  const physicalBuildings =
    useMemo(
      () =>
        createVerifiedMarsBuildingInstances(
          buildings,
        ),
      [buildings],
    );

  const commandHub =
    buildings.find(
      (building) =>
        building.building_key ===
          "command_hub" &&
        building.built,
    );

  const inventoryBuildingDefinition =
    inventoryPlacementItem?.building_key
      ? buildings.find(
          (building) =>
            building.building_key ===
            inventoryPlacementItem.building_key,
        )
      : undefined;


  return (
    <>
      {/*
       * Neutral Mars interaction surface.
       *
       * Clicking genuine empty Colony space clears the current
       * UI selection. Physical building meshes stop propagation,
       * so this does not steal building clicks.
       */}
      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        position={[
          0,
          -0.035,
          0,
        ]}
        onPointerDown={(event) => {
          event.stopPropagation();

          setSelectedBuildingId(null);
        }}
      >
        <planeGeometry args={[80, 80]} />

        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>

      <ambientLight
        intensity={0.68}
        color="#aab3c6"
      />

      <hemisphereLight
        intensity={0.84}
        color="#dbe8ff"
        groundColor="#63301d"
      />

      <directionalLight
        castShadow
        position={[
          12,
          20,
          10,
        ]}
        intensity={3.6}
        color="#ffd0a0"
      />

      <directionalLight
        position={[
          -10,
          9,
          -8,
        ]}
        intensity={0.9}
        color="#884cff"
      />

      <MarsColonyInfrastructure
        buildings={
          physicalBuildings
        }
      />

      {commandHub && (
        <MarsCommandHubBuilding
          building={commandHub}
          physicalBuildings={
            physicalBuildings
          }
          canManageColony={
            canManageColony
          }
          selected={
            selectedBuildingId ===
            commandHub.building_id
          }
          onSelect={() => {
            if (commandHub.building_id) {
              setSelectedBuildingId(
                commandHub.building_id,
              );
            }
          }}
          onDeselect={() =>
            setSelectedBuildingId(null)
          }
        />
      )}

      {buildings
        .filter(
          (building) =>
            building.built &&
            building.building_key !==
              "command_hub",
        )
        .map((building) => (
          <MarsPersistentColonyBuilding
            key={
              building.building_id ??
              `catalog:${building.building_key}`
            }
            building={building}
            physicalBuildings={
              physicalBuildings
            }
            canManageColony={
              canManageColony
            }
            selected={
              selectedBuildingId ===
              building.building_id
            }
            onSelect={() => {
              if (building.building_id) {
                setSelectedBuildingId(
                  building.building_id,
                );
              }
            }}
            onDeselect={() =>
              setSelectedBuildingId(null)
            }
          />
        ))}

      {inventoryPlacementItem &&
        inventoryBuildingDefinition && (
          <MarsInventoryBuildingPlacement
            key={
              inventoryPlacementItem.inventory_id
            }
            item={
              inventoryPlacementItem
            }
            definition={
              inventoryBuildingDefinition
            }
            physicalBuildings={
              physicalBuildings
            }
            canManageColony={
              canManageColony
            }
            onCancel={
              onCancelInventoryPlacement
            }
            onSaved={
              onInventoryPlacementSaved
            }
          />
        )}

      <ContactShadows
        position={[
          0,
          0.04,
          0,
        ]}
        opacity={0.52}
        scale={36}
        blur={2.2}
        far={16}
        resolution={1024}
        color="#170b08"
      />
    </>
  );
}


export function MarsColonyWorld3D({
  buildings,
  canManageColony = false,
  inventoryPlacementItem = null,
  onCancelInventoryPlacement,
  onInventoryPlacementSaved,
}: Props) {
  return (
    <div
      className="mars-colony-world-3d mars-colony-world-3d--fixed-surface"
      role="region"
      aria-label="Mars Colony 3D World"
    >
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: [
            -15,
            14,
            16,
          ],
          zoom: 48,
          near: 0.1,
          far: 140,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference:
            "high-performance",
        }}
        onCreated={({
          camera,
          gl,
        }) => {
          camera.lookAt(
            0,
            0,
            0,
          );

          gl.outputColorSpace =
            THREE.SRGBColorSpace;

          gl.toneMapping =
            THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure =
            1.08;

          gl.setClearColor(
            0x000000,
            0,
          );
        }}
      >
        <Suspense fallback={null}>
          <ColonyScene
            buildings={buildings}
            canManageColony={
              canManageColony
            }
            inventoryPlacementItem={
              inventoryPlacementItem
            }
            onCancelInventoryPlacement={
              onCancelInventoryPlacement
            }
            onInventoryPlacementSaved={
              onInventoryPlacementSaved
            }
          />
        </Suspense>
      </Canvas>

      <div
        className="mars-colony-world-3d__hint"
        aria-hidden="true"
      >
        <span>
          DRAG BUILDINGS TO MOVE
        </span>
      </div>
    </div>
  );
}

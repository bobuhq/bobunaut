import {
  Canvas,
  type ThreeEvent,
  useThree,
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
import MarsColonyDensityLayer from "./components/MarsColonyDensityLayer";
import MarsCinematicColonyLayer from "./components/MarsCinematicColonyLayer";
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


function MarsCinematicCamera({
  buildings,
}: {
  buildings: MarsBuildingInstance[];
}) {
  const {
    camera,
  } = useThree();

  const commandHub =
    buildings.find(
      (building) =>
        building.buildingKey ===
        "command_hub",
    );

  useEffect(() => {
    if (!commandHub) {
      return;
    }

    const rotated =
      commandHub.rotationY === 90 ||
      commandHub.rotationY === 270;

    const width =
      rotated
        ? commandHub.footprintDepth
        : commandHub.footprintWidth;

    const depth =
      rotated
        ? commandHub.footprintWidth
        : commandHub.footprintDepth;

    const world =
      marsGridToWorld(
        commandHub.gridX,
        commandHub.gridZ,
        width,
        depth,
      );

    /*
     * Main cinematic colony framing.
     *
     * Target:
     * - 3/4 perspective
     * - city center below horizon
     * - enough foreground for dense colony
     * - enough background for future mountains / rocket
     */
    camera.position.set(
      world.x + 15.5,
      13.5,
      world.z + 20.5,
    );

    camera.lookAt(
      world.x,
      0.6,
      world.z - 1.2,
    );

    camera.updateProjectionMatrix();
  }, [
    camera,
    commandHub,
  ]);

  return null;
}


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
  /*
   * Live Placement Overlay V1.
   *
   * Server snapshot remains authoritative.
   * These overrides exist only while a physical building is
   * being interactively moved before SAVE/CANCEL completes.
   */
  const [
    livePlacementOverrides,
    setLivePlacementOverrides,
  ] = useState<
    Record<
      string,
      {
        gridX: number;
        gridZ: number;
        rotationY:
          MarsColonyRotation;
      }
    >
  >({});

  const physicalBuildings =
    useMemo(
      () =>
        createVerifiedMarsBuildingInstances(
          buildings,
        ),
      [buildings],
    );

  const infrastructureBuildings =
    useMemo(
      () =>
        physicalBuildings.map(
          (building) => {
            const override =
              livePlacementOverrides[
                building.buildingId
              ];

            if (!override) {
              return building;
            }

            return {
              ...building,
              gridX: override.gridX,
              gridZ: override.gridZ,
              rotationY:
                override.rotationY,
            };
          },
        ),
      [
        physicalBuildings,
        livePlacementOverrides,
      ],
    );

  function updateLivePlacement(
    buildingId: string,
    placement: {
      gridX: number;
      gridZ: number;
      rotationY: MarsColonyRotation;
    },
  ) {
    setLivePlacementOverrides(
      (current) => ({
        ...current,
        [buildingId]: placement,
      }),
    );
  }

  function clearLivePlacement(
    buildingId: string,
  ) {
    setLivePlacementOverrides(
      (current) => {
        if (!(buildingId in current)) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[buildingId];

        return next;
      },
    );
  }

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
      <MarsCinematicCamera
        buildings={
          infrastructureBuildings
        }
      />

      <fog
        attach="fog"
        args={[
          "#2a110c",
          24,
          68,
        ]}
      />
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

      {/*
       * BOBU Mars Cinematic Lighting.
       *
       * Warm Martian key light + cool technological rim.
       * Ambient kept deliberately low so buildings gain depth.
       */}
      <ambientLight
        intensity={0.34}
        color="#6b3d32"
      />

      <hemisphereLight
        intensity={0.72}
        color="#d88958"
        groundColor="#160908"
      />

      <directionalLight
        castShadow
        position={[
          -18,
          24,
          12,
        ]}
        intensity={3.6}
        color="#ffad68"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />

      <directionalLight
        position={[
          18,
          10,
          -15,
        ]}
        intensity={1.55}
        color="#597cff"
      />

      <pointLight
        position={[
          0,
          8,
          -10,
        ]}
        intensity={4.5}
        distance={32}
        color="#ff784c"
      />

      <pointLight
        position={[
          -8,
          6,
          8,
        ]}
        intensity={3.2}
        distance={26}
        color="#4e75ff"
      />

      <MarsColonyInfrastructure
        buildings={
          infrastructureBuildings
        }
      />

      <MarsColonyDensityLayer
        buildings={
          infrastructureBuildings
        }
      />

      <MarsCinematicColonyLayer
        buildings={
          infrastructureBuildings
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
          onLivePlacementChange={
            (placement) => {
              if (
                commandHub.building_id
              ) {
                updateLivePlacement(
                  commandHub.building_id,
                  placement,
                );
              }
            }
          }
          onLivePlacementClear={() => {
            if (
              commandHub.building_id
            ) {
              clearLivePlacement(
                commandHub.building_id,
              );
            }
          }}
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
            onLivePlacementChange={
              (placement) => {
                if (
                  building.building_id
                ) {
                  updateLivePlacement(
                    building.building_id,
                    placement,
                  );
                }
              }
            }
            onLivePlacementClear={() => {
              if (
                building.building_id
              ) {
                clearLivePlacement(
                  building.building_id,
                );
              }
            }}
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
        shadows
        /*
         * Mars GPU budget.
         *
         * 1.75 DPR was too expensive once the cinematic city
         * layer was added and could cause Firefox WebGL context
         * loss on Retina displays.
         */
        dpr={[1, 1.25]}
        camera={{
          position: [
            15.5,
            13.5,
            20.5,
          ],
          fov: 42,
          near: 0.1,
          far: 180,
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
          gl.outputColorSpace =
            THREE.SRGBColorSpace;

          gl.toneMapping =
            THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure =
            1.18;

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

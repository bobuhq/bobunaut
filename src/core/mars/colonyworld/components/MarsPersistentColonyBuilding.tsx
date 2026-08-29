import {
  type ThreeEvent,
} from "@react-three/fiber";

import {
  Html,
} from "@react-three/drei";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";

import type {
  MarsColonyBaseBuilding,
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

import {
  moveMyMarsColonyBuilding,
} from "../../MarsColonyBaseService";

import type {
  MarsBuildingInstance,
} from "../types/MarsBuildingInstance";

import {
  marsGridToWorld,
  marsWorldToGrid,
  MARS_GRID_UNIT,
  validateMarsPlacement,
} from "../engine";

import MarsPlacementGrid from "./MarsPlacementGrid";
import MarsPlacementPreview from "./MarsPlacementPreview";
import MarsColonyBuildingModel from "../models/MarsColonyBuildingModel";


type Placement = {
  gridX: number;
  gridZ: number;
  rotationY: MarsColonyRotation;
};


type MarsPhysicalBuildings =
  MarsBuildingInstance[];


export default function MarsPersistentColonyBuilding({
  building,
  physicalBuildings,
  canManageColony,
  mapMin,
  mapMax,
  selected,
  onSelect,
  onDeselect,
  onLivePlacementChange,
  onLivePlacementClear,
}: {
  building: MarsColonyBaseBuilding;
  physicalBuildings: MarsPhysicalBuildings;
  canManageColony: boolean;
  mapMin: number;
  mapMax: number;
  selected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onLivePlacementChange: (
    placement: Placement,
  ) => void;
  onLivePlacementClear: () => void;
}) {
  const initialPlacement =
    useMemo<Placement>(
      () => ({
        gridX: building.grid_x ?? 0,
        gridZ: building.grid_z ?? 0,
        rotationY: building.rotation_y,
      }),
      [
        building.grid_x,
        building.grid_z,
        building.rotation_y,
      ],
    );

  const [
    placement,
    setPlacement,
  ] = useState<Placement>(
    initialPlacement,
  );

  const [
    committedPlacement,
    setCommittedPlacement,
  ] = useState<Placement>(
    initialPlacement,
  );

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    saveError,
    setSaveError,
  ] = useState(false);


  useEffect(() => {
    setCommittedPlacement(
      initialPlacement,
    );

    setPlacement(
      initialPlacement,
    );
  }, [initialPlacement]);


  useEffect(() => {
    if (!editing) {
      return;
    }

    onLivePlacementChange(
      placement,
    );
  }, [
    editing,
    placement,
    onLivePlacementChange,
  ]);


  if (
    !building.built ||
    building.building_key === "command_hub" ||
    building.grid_x === null ||
    building.grid_z === null ||
    !building.building_id
  ) {
    return null;
  }


  const baseWidth = Math.max(
    building.footprint_width,
    1,
  );

  const baseDepth = Math.max(
    building.footprint_depth,
    1,
  );

  const rotated =
    placement.rotationY === 90 ||
    placement.rotationY === 270;

  const width =
    rotated
      ? baseDepth
      : baseWidth;

  const depth =
    rotated
      ? baseWidth
      : baseDepth;

  const world = marsGridToWorld(
    placement.gridX,
    placement.gridZ,
    width,
    depth,
  );

  /*
   * V3 MOVE validation.
   *
   * The moving building excludes itself from occupancy by
   * physical buildingId.
   */
  const validation =
    validateMarsPlacement(
      {
        buildingId:
          building.building_id,

        buildingKey:
          building.building_key,

        gridX:
          placement.gridX,

        gridZ:
          placement.gridZ,

        rotationY:
          placement.rotationY,

        footprintWidth:
          baseWidth,

        footprintDepth:
          baseDepth,
      },

      physicalBuildings,
      {
        min: mapMin,
        max: mapMax,
      },
    );


  function handlePointerDown(
    event: ThreeEvent<PointerEvent>,
  ) {
    if (
      !canManageColony ||
      saving
    ) {
      return;
    }

    event.stopPropagation();
    setSaveError(false);

    if (!selected) {
      onSelect();
      return;
    }

    if (!editing) {
      return;
    }

    setDragging(true);

    document.body.style.cursor =
      "grabbing";
  }


  function handlePointerMove(
    event: ThreeEvent<PointerEvent>,
  ) {
    if (
      !dragging ||
      !canManageColony
    ) {
      return;
    }

    event.stopPropagation();

    const next =
      marsWorldToGrid(
        event.point.x,
        event.point.z,
        width,
        depth,
      );

    setPlacement(
      (current) => ({
        ...current,
        ...next,
      }),
    );
  }


  function handlePointerUp(
    event: ThreeEvent<PointerEvent>,
  ) {
    if (!dragging) {
      return;
    }

    event.stopPropagation();

    setDragging(false);

    document.body.style.cursor =
      "";
  }


  function beginMove() {
    if (
      !canManageColony ||
      saving
    ) {
      return;
    }

    setSaveError(false);
    setEditing(true);
  }


  function rotatePlacement() {
    if (
      !editing ||
      saving
    ) {
      return;
    }

    setSaveError(false);

    setPlacement(
      (current) => ({
        ...current,
        rotationY:
          (
            (current.rotationY + 90) %
            360
          ) as MarsColonyRotation,
      }),
    );
  }


  function cancelMove() {
    if (saving) {
      return;
    }

    setDragging(false);
    setEditing(false);
    setSaveError(false);

    setPlacement(
      committedPlacement,
    );

    onLivePlacementClear();

    document.body.style.cursor =
      "";
  }


  async function saveMove() {
    if (
      !canManageColony ||
      saving ||
      !editing
    ) {
      return;
    }

    if (!validation.valid) {
      setSaveError(true);
      return;
    }

    setSaving(true);
    setSaveError(false);

    try {
      const result =
        await moveMyMarsColonyBuilding(
          building.building_id!,
          placement.gridX,
          placement.gridZ,
          placement.rotationY,
        );

      const savedPlacement: Placement = {
        gridX: result.grid_x,
        gridZ: result.grid_z,
        rotationY: result.rotation_y,
      };

      setCommittedPlacement(
        savedPlacement,
      );

      setPlacement(
        savedPlacement,
      );

      setDragging(false);
      setEditing(false);

      onLivePlacementClear();

      document.body.style.cursor =
        "";
    } catch (error) {
      console.error(
        "Mars persistent building move failed:",
        error,
      );

      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }


  return (
    <>
      {editing && (
        <>
          <MarsPlacementGrid
            mapMin={mapMin}
            mapMax={mapMax}
          />

          <MarsPlacementPreview
            worldX={world.x}
            worldZ={world.z}
            footprintWidth={width}
            footprintDepth={depth}
            valid={validation.valid}
            mode="move"
          />
        </>
      )}

      <Html
        position={[
          world.x,
          1.35,
          world.z,
        ]}
        center
        transform={false}
        style={{
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            padding: "5px 8px",
            borderRadius: "7px",
            background:
              "rgba(12, 8, 20, 0.86)",
            border:
              selected
                ? "1px solid rgba(225, 170, 255, 0.85)"
                : "1px solid rgba(210, 140, 255, 0.35)",
            color: "#f2e8ff",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          {building.building_name}
        </div>
      </Html>

      <group
        position={[
          world.x,
          0.24,
          world.z,
        ]}
        rotation={[
          0,
          THREE.MathUtils.degToRad(
            placement.rotationY,
          ),
          0,
        ]}
      >
        <group
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            handlePointerUp
          }
          onPointerOver={() => {
            if (
              canManageColony &&
              !dragging
            ) {
              document.body.style.cursor =
                editing
                  ? "grab"
                  : "pointer";
            }
          }}
          onPointerOut={() => {
            if (!dragging) {
              document.body.style.cursor =
                "";
            }
          }}
        >
          <MarsColonyBuildingModel
            buildingKey={
              building.building_key
            }
            selected={selected}
          />
        </group>

        {selected && (
          <Html
            position={[0, 1.72, 0]}
            center
            transform={false}
          >
            <div
              style={{
                display: "flex",
                gap: "6px",
                padding: "6px",
                borderRadius: "9px",
                background:
                  "rgba(8, 5, 14, 0.92)",
                border:
                  "1px solid rgba(190, 120, 255, 0.48)",
                whiteSpace: "nowrap",
              }}
            >
              {!editing ? (
                <>
                  <button
                    type="button"
                    disabled={
                      !canManageColony ||
                      saving
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      beginMove();
                    }}
                  >
                    MOVE
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeselect();
                    }}
                  >
                    CLOSE
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(event) => {
                      event.stopPropagation();
                      rotatePlacement();
                    }}
                  >
                    ROTATE
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={(event) => {
                      event.stopPropagation();
                      cancelMove();
                    }}
                  >
                    CANCEL
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      !validation.valid
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      void saveMove();
                    }}
                  >
                    {saving
                      ? "SAVING..."
                      : "SAVE"}
                  </button>
                </>
              )}
            </div>
          </Html>
        )}

        {saveError && (
          <pointLight
            position={[0, 1.2, 0]}
            color="#ff334f"
            intensity={8}
            distance={4}
          />
        )}
      </group>
    </>
  );
}

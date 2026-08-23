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

import {
  MarsCommandHubModel,
} from "../../MarsCommandHub3D";

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


type Placement = {
  gridX: number;
  gridZ: number;
  rotationY: MarsColonyRotation;
};


export default function MarsCommandHubBuilding({
  building,
  physicalBuildings,
  canManageColony,
  selected,
  onSelect,
  onDeselect,
  onLivePlacementChange,
  onLivePlacementClear,
}: {
  building: MarsColonyBaseBuilding;
  physicalBuildings: MarsBuildingInstance[];
  canManageColony: boolean;
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
        gridX:
          building.grid_x ?? 0,

        gridZ:
          building.grid_z ?? 0,

        rotationY:
          building.rotation_y,
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

  /*
   * Last placement confirmed by the server.
   *
   * This is NOT browser-authoritative placement data.
   * It is initialized from get_my_mars_colony_base()
   * and updated only from move_my_mars_colony_building()
   * successful RPC results.
   */
  const [
    committedPlacement,
    setCommittedPlacement,
  ] = useState<Placement>(
    initialPlacement,
  );

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    editing,
    setEditing,
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
    /*
     * Parent data changed because authoritative Colony Base
     * data was loaded/refreshed.
     *
     * Do not depend on editing/dragging here. Doing so caused
     * a successful SAVE to immediately restore the stale
     * pre-save prop position when edit mode closed.
     */
    setCommittedPlacement(
      initialPlacement,
    );

    setPlacement(
      initialPlacement,
    );
  }, [
    initialPlacement,
  ]);


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


  const width =
    Math.max(
      building.footprint_width,
      1,
    );

  const depth =
    Math.max(
      building.footprint_depth,
      1,
    );


  const world =
    marsGridToWorld(
      placement.gridX,
      placement.gridZ,
      width,
      depth,
    );


  /*
   * Command Hub movement uses the same authoritative
   * Mars Placement Engine V3 validation pipeline as every
   * other physical Colony building.
   *
   * buildingId is the real physical UUID, so the occupancy
   * engine excludes this Command Hub instance itself while
   * still checking every other physical structure.
   *
   * This is immediate client UX validation only.
   * Supabase remains final authority on SAVE.
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
          building.footprint_width,

        footprintDepth:
          building.footprint_depth,
      },

      physicalBuildings,
    );


  async function savePlacement(): Promise<boolean> {
    if (
      !canManageColony ||
      saving
    ) {
      return false;
    }

    /*
     * Reject an invalid local placement before calling the
     * production movement RPC.
     *
     * Server validation is still authoritative.
     */
    if (!validation.valid) {
      setSaveError(true);
      return false;
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
        gridX:
          result.grid_x,

        gridZ:
          result.grid_z,

        rotationY:
          result.rotation_y,
      };

      /*
       * The RPC response is the authoritative placement.
       * Preserve it when edit mode closes instead of falling
       * back to stale parent props from before this SAVE.
       */
      setCommittedPlacement(
        savedPlacement,
      );

      setPlacement(
        savedPlacement,
      );

      return true;
    } catch (error) {
      console.error(
        "Mars building placement failed:",
        error,
      );

      /*
       * Keep the attempted placement visible.
       *
       * A rejected server placement must not silently
       * teleport the building back to its old position.
       * The Builder can retry or explicitly CANCEL.
       */
      setSaveError(true);

      return false;
    } finally {
      setSaving(false);
    }
  }


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

    onSelect();
    setEditing(true);
    setSaveError(false);
  }


  function rotateBuilding() {
    if (
      !editing ||
      saving
    ) {
      return;
    }

    setPlacement(
      (current) => ({
        ...current,
        rotationY:
          ((current.rotationY + 90) % 360) as MarsColonyRotation,
      }),
    );
  }


  function cancelPlacement() {
    if (saving) {
      return;
    }

    setDragging(false);
    setEditing(false);

    /*
     * Keep Command Hub selected after CANCEL so MOVE remains
     * immediately available.
     */
    onDeselect();

    setSaveError(false);

    setPlacement(
      committedPlacement,
    );

    onLivePlacementClear();

    document.body.style.cursor =
      "";
  }


  async function confirmPlacement() {
    if (
      !editing ||
      saving
    ) {
      return;
    }

    const saved =
      await savePlacement();

    if (!saved) {
      return;
    }

    setDragging(false);
    setEditing(false);

    onLivePlacementClear();

    /*
     * SAVE completed successfully.
     *
     * Keep the authoritative building selected so the MOVE
     * action is immediately available again.
     */
    onDeselect();

    document.body.style.cursor =
      "";
  }


  return (
    <>
      {/*
       * Placement raycast surface.
       *
       * IMPORTANT:
       * This surface must exist only while placement editing
       * is active. Otherwise an invisible 80x80 mesh can
       * intercept pointer events intended for Command Hub.
       */}
      {editing && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.01,
            0,
          ]}
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            handlePointerUp
          }
        >
          <planeGeometry
            args={[
              80,
              80,
            ]}
          />

          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      )}


      {editing && (
        <MarsPlacementGrid />
      )}


      {/* Placement footprint */}
      {editing && (
        <MarsPlacementPreview
          worldX={world.x}
          worldZ={world.z}
          footprintWidth={width}
          footprintDepth={depth}
          valid={validation.valid}
          error={saveError}
          mode="command"
        />
      )}


      {selected && (
        <mesh
          position={[
            world.x,
            0.07,
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
              Math.max(width, depth) *
                MARS_GRID_UNIT *
                0.72,
              Math.max(width, depth) *
                MARS_GRID_UNIT *
                0.82,
              64,
            ]}
          />

          <meshBasicMaterial
            color="#c47cff"
            transparent
            opacity={0.82}
            depthWrite={false}
          />
        </mesh>
      )}


      {/*
       * Dedicated Command Hub selection hitbox.
       *
       * Do not rely on the decorative child meshes of the
       * Command Hub model for selection. This invisible mesh
       * gives the building one stable pointer target while
       * preserving the existing visual model.
       */}
      {!editing && (
        <mesh
          position={[
            world.x,
            1.35,
            world.z,
          ]}
          onPointerDown={
            handlePointerDown
          }
        >
          <cylinderGeometry
            args={[
              Math.max(width, depth) *
                MARS_GRID_UNIT *
                0.54,
              Math.max(width, depth) *
                MARS_GRID_UNIT *
                0.54,
              2.25,
              32,
            ]}
          />

          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      )}


      <group
        position={[
          world.x,
          dragging
            ? 0.38
            : 0.08,
          world.z,
        ]}
        rotation={[
          0,
          THREE.MathUtils.degToRad(
            placement.rotationY,
          ),
          0,
        ]}
        scale={
          dragging
            ? 1.16
            : 1.1
        }
        onPointerDown={
          handlePointerDown
        }
        onPointerUp={
          handlePointerUp
        }
      >
        <MarsCommandHubModel
          level={
            building.building_level
          }
        />

      </group>

      {/*
       * Command Hub action UI.
       *
       * IMPORTANT:
       * Html uses the authoritative WORLD position of the
       * building, but remains screen-space UI.
       *
       * Do not use transform, sprite, distanceFactor or CSS
       * pixel translation here. Those make the control's
       * visual relationship to the building zoom-dependent.
       */}
      {selected && (
        <Html
          position={[
            world.x,
            3.45,
            world.z,
          ]}
          center
          transform={false}
          style={{
            pointerEvents: "auto",
          }}
        >
          <div
            className="mars-placement-controls"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            {!editing ? (
              <button
                type="button"
                className="mars-placement-controls__move"
                onClick={beginMove}
              >
                MOVE
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={rotateBuilding}
                  disabled={saving}
                >
                  ROTATE
                </button>

                <button
                  type="button"
                  onClick={cancelPlacement}
                  disabled={saving}
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  className="mars-placement-controls__save"
                  onClick={confirmPlacement}
                  disabled={
              saving ||
              !validation.valid
            }
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
          position={[
            world.x,
            2.5,
            world.z,
          ]}
          color="#ff334f"
          intensity={8}
          distance={4}
        />
      )}
    </>
  );
}

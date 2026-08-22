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
  moveMyMarsColonyBuilding,
} from "../MarsColonyBaseService";

import {
  placeMyMarsInventoryBuilding,
  type MarsInventoryItem,
} from "../MarsMarketService";

import {
  MarsCommandHubModel,
} from "../MarsCommandHub3D";

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


const GRID_UNIT = 1.35;

const MAP_MIN = -12;
const MAP_MAX = 12;


function clampPlacement(
  value: number,
  footprintSize: number,
) {
  return THREE.MathUtils.clamp(
    value,
    MAP_MIN,
    MAP_MAX - footprintSize + 1,
  );
}


function placementToWorld(
  gridX: number,
  gridZ: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  return {
    x:
      (
        gridX +
        (footprintWidth - 1) / 2
      ) *
      GRID_UNIT,

    z:
      (
        gridZ +
        (footprintDepth - 1) / 2
      ) *
      GRID_UNIT,
  };
}


function worldToPlacement(
  x: number,
  z: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  const rawX =
    Math.round(
      x / GRID_UNIT -
      (footprintWidth - 1) / 2,
    );

  const rawZ =
    Math.round(
      z / GRID_UNIT -
      (footprintDepth - 1) / 2,
    );

  return {
    gridX:
      clampPlacement(
        rawX,
        footprintWidth,
      ),

    gridZ:
      clampPlacement(
        rawZ,
        footprintDepth,
      ),
  };
}


function PlacementGrid() {
  return (
    <gridHelper
      args={[
        25 * GRID_UNIT,
        25,
        new THREE.Color("#aa74df"),
        new THREE.Color("#754e67"),
      ]}
      position={[0, 0.025, 0]}
      material-transparent
      material-opacity={0.16}
    />
  );
}


function CommandHub({
  building,
  canManageColony,
}: {
  building: MarsColonyBaseBuilding;
  canManageColony: boolean;
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

  /*
   * Command Hub controls stay hidden until the building is
   * explicitly selected by the user.
   */
  const [
    selected,
    setSelected,
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
    placementToWorld(
      placement.gridX,
      placement.gridZ,
      width,
      depth,
    );


  async function savePlacement(): Promise<boolean> {
    if (
      !canManageColony ||
      saving
    ) {
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
      setSelected(true);
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
      worldToPlacement(
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

    setSelected(true);
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
    setSelected(false);

    setSaveError(false);

    setPlacement(
      committedPlacement,
    );

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

    /*
     * SAVE completed successfully.
     *
     * Keep the authoritative building selected so the MOVE
     * action is immediately available again.
     */
    setSelected(false);

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
        <PlacementGrid />
      )}


      {/* Placement footprint */}
      {editing && (
        <mesh
          position={[
            world.x,
            0.055,
            world.z,
          ]}
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
        >
          <planeGeometry
            args={[
              width *
                GRID_UNIT *
                0.96,

              depth *
                GRID_UNIT *
                0.96,
            ]}
          />

          <meshBasicMaterial
            color="#a950ff"
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
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
                GRID_UNIT *
                0.72,
              Math.max(width, depth) *
                GRID_UNIT *
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
                GRID_UNIT *
                0.9,
              Math.max(width, depth) *
                GRID_UNIT *
                0.9,
              3.2,
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
                  disabled={saving}
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



function InventoryBuildingPlacement({
  item,
  definition,
  buildings,
  canManageColony,
  onCancel,
  onSaved,
}: {
  item: MarsInventoryItem;
  definition: MarsColonyBaseBuilding;
  buildings: MarsColonyBaseBuilding[];
  canManageColony: boolean;
  onCancel?: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const [
    placement,
    setPlacement,
  ] = useState<Placement>(() => {
    const targetWidth = Math.max(
      definition.footprint_width,
      1,
    );

    const targetDepth = Math.max(
      definition.footprint_depth,
      1,
    );

    const occupied = buildings
      .filter(
        (building) =>
          building.built &&
          building.grid_x !== null &&
          building.grid_z !== null,
      )
      .map((building) => {
        const rotated =
          building.rotation_y === 90 ||
          building.rotation_y === 270;

        const baseWidth = Math.max(
          building.footprint_width,
          1,
        );

        const baseDepth = Math.max(
          building.footprint_depth,
          1,
        );

        return {
          x: building.grid_x as number,
          z: building.grid_z as number,
          width: rotated
            ? baseDepth
            : baseWidth,
          depth: rotated
            ? baseWidth
            : baseDepth,
        };
      });

    const overlaps = (
      x: number,
      z: number,
    ) =>
      occupied.some(
        (other) =>
          x < other.x + other.width &&
          x + targetWidth > other.x &&
          z < other.z + other.depth &&
          z + targetDepth > other.z,
      );

    /*
     * Search outward from Colony center.
     * This only selects the initial preview position.
     * Final collision authority remains the server RPC.
     */
    const candidates: Array<{
      x: number;
      z: number;
      distance: number;
    }> = [];

    for (
      let z = MAP_MIN;
      z <= MAP_MAX - targetDepth + 1;
      z += 1
    ) {
      for (
        let x = MAP_MIN;
        x <= MAP_MAX - targetWidth + 1;
        x += 1
      ) {
        candidates.push({
          x,
          z,
          distance:
            Math.abs(x) +
            Math.abs(z),
        });
      }
    }

    candidates.sort(
      (a, b) =>
        a.distance - b.distance ||
        a.z - b.z ||
        a.x - b.x,
    );

    const available =
      candidates.find(
        (candidate) =>
          !overlaps(
            candidate.x,
            candidate.z,
          ),
      );

    return {
      gridX: available?.x ?? MAP_MIN,
      gridZ: available?.z ?? MAP_MIN,
      rotationY: 0,
    };
  });

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

  const baseWidth =
    Math.max(
      definition.footprint_width,
      1,
    );

  const baseDepth =
    Math.max(
      definition.footprint_depth,
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

  const world =
    placementToWorld(
      placement.gridX,
      placement.gridZ,
      width,
      depth,
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
    setDragging(true);

    document.body.style.cursor =
      "grabbing";
  }

  function handlePointerMove(
    event: ThreeEvent<PointerEvent>,
  ) {
    if (
      !dragging ||
      !canManageColony ||
      saving
    ) {
      return;
    }

    event.stopPropagation();

    const next =
      worldToPlacement(
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

  function rotateBuilding() {
    if (saving) {
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

  function cancelPlacement() {
    if (saving) {
      return;
    }

    setDragging(false);
    setSaveError(false);

    document.body.style.cursor =
      "";

    onCancel?.();
  }

  async function confirmPlacement() {
    if (
      saving ||
      !canManageColony
    ) {
      return;
    }

    setSaving(true);
    setSaveError(false);

    try {
      await placeMyMarsInventoryBuilding(
        item.item_key,
        placement.gridX,
        placement.gridZ,
        placement.rotationY,
      );

      setDragging(false);

      document.body.style.cursor =
        "";

      await onSaved?.();
    } catch (error) {
      console.error(
        "Mars inventory placement failed:",
        error,
      );

      /*
       * Keep attempted placement visible so the Builder
       * can move/rotate and retry after a server rejection.
       */
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/*
       * Dedicated placement raycast surface.
       * Exists only while inventory placement is active.
       */}
      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        position={[
          0,
          0.012,
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

      <PlacementGrid />

      {/*
       * Authoritative footprint preview.
       * This is placement UI, not a fake production model.
       */}
      <mesh
        position={[
          world.x,
          0.065,
          world.z,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <planeGeometry
          args={[
            width *
              GRID_UNIT *
              0.96,

            depth *
              GRID_UNIT *
              0.96,
          ]}
        />

        <meshBasicMaterial
          color={
            saveError
              ? "#ff334f"
              : "#d28cff"
          }
          transparent
          opacity={
            saveError
              ? 0.44
              : 0.32
          }
          depthWrite={false}
        />
      </mesh>

      <group
        position={[
          world.x,
          dragging
            ? 0.5
            : 0.24,
          world.z,
        ]}
        rotation={[
          0,
          THREE.MathUtils.degToRad(
            placement.rotationY,
          ),
          0,
        ]}
        onPointerDown={
          handlePointerDown
        }
        onPointerUp={
          handlePointerUp
        }
      >
        <mesh
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              Math.max(
                width *
                  GRID_UNIT *
                  0.72,
                1,
              ),
              0.55,
              Math.max(
                depth *
                  GRID_UNIT *
                  0.72,
                1,
              ),
            ]}
          />

          <meshStandardMaterial
            color="#a866d8"
            transparent
            opacity={0.34}
            roughness={0.62}
            metalness={0.28}
          />
        </mesh>
      </group>

      <Html
        position={[
          world.x,
          2.25,
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
          <span
            style={{
              padding: "0 7px",
              opacity: 0.8,
              fontSize: "10px",
              whiteSpace: "nowrap",
            }}
          >
            {item.item_name}
          </span>

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
            onClick={() =>
              void confirmPlacement()
            }
            disabled={saving}
          >
            {saving
              ? "SAVING..."
              : "SAVE"}
          </button>
        </div>
      </Html>

      {saveError && (
        <pointLight
          position={[
            world.x,
            2.3,
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



function PersistentColonyBuilding({
  building,
  canManageColony,
}: {
  building: MarsColonyBaseBuilding;
  canManageColony: boolean;
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
    selected,
    setSelected,
  ] = useState(false);

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

  const world = placementToWorld(
    placement.gridX,
    placement.gridZ,
    width,
    depth,
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
      setSelected(true);
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
      worldToPlacement(
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
        <PlacementGrid />
      )}

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
        <mesh
          castShadow
          receiveShadow
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
          <boxGeometry
            args={[
              Math.max(
                width *
                  GRID_UNIT *
                  0.72,
                1,
              ),
              0.55,
              Math.max(
                depth *
                  GRID_UNIT *
                  0.72,
                1,
              ),
            ]}
          />

          <meshStandardMaterial
            color={
              saveError
                ? "#ff334f"
                : selected
                  ? "#c782ff"
                  : "#a866d8"
            }
            roughness={0.62}
            metalness={0.28}
            emissive={
              selected
                ? "#35104f"
                : "#000000"
            }
            emissiveIntensity={
              selected
                ? 0.7
                : 0
            }
          />
        </mesh>

        <Html
          position={[0, 1.05, 0]}
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
                "rgba(12, 8, 20, 0.82)",
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
                      setSelected(false);
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
                    disabled={saving}
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

function ColonyScene({
  buildings,
  canManageColony,
  inventoryPlacementItem,
  onCancelInventoryPlacement,
  onInventoryPlacementSaved,
}: Props & {
  canManageColony: boolean;
}) {
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

      {commandHub && (
        <CommandHub
          building={commandHub}
          canManageColony={
            canManageColony
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
          <PersistentColonyBuilding
            key={
              building.building_id ??
              `catalog:${building.building_key}`
            }
            building={building}
            canManageColony={
              canManageColony
            }
          />
        ))}

      {inventoryPlacementItem &&
        inventoryBuildingDefinition && (
          <InventoryBuildingPlacement
            key={
              inventoryPlacementItem.inventory_id
            }
            item={
              inventoryPlacementItem
            }
            definition={
              inventoryBuildingDefinition
            }
            buildings={buildings}
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

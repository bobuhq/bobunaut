import {
  type ThreeEvent,
} from "@react-three/fiber";

import {
  Html,
} from "@react-three/drei";

import {
  useState,
} from "react";

import * as THREE from "three";

import type {
  MarsColonyBaseBuilding,
  MarsColonyRotation,
} from "../../MarsColonyBaseService";

import {
  placeMyMarsInventoryBuilding,
  type MarsInventoryItem,
} from "../../MarsMarketService";

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


export default function MarsInventoryBuildingPlacement({
  item,
  definition,
  physicalBuildings,
  canManageColony,
  mapMin,
  mapMax,
  onCancel,
  onSaved,
}: {
  item: MarsInventoryItem;
  definition: MarsColonyBaseBuilding;
  physicalBuildings: MarsPhysicalBuildings;
  canManageColony: boolean;
  mapMin: number;
  mapMax: number;
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

    /*
     * Mars Placement Engine V3 initial position search.
     *
     * Search every legal top-left grid cell, ordered from
     * Colony center outward.
     *
     * The SAME V3 validator used by drag preview decides
     * whether a candidate is available.
     */
    const candidates: Array<{
      gridX: number;
      gridZ: number;
      distance: number;
    }> = [];

    for (
      let gridZ = mapMin;
      gridZ <=
      mapMax - targetDepth + 1;
      gridZ += 1
    ) {
      for (
        let gridX = mapMin;
        gridX <=
        mapMax - targetWidth + 1;
        gridX += 1
      ) {
        candidates.push({
          gridX,
          gridZ,

          distance:
            Math.abs(gridX) +
            Math.abs(gridZ),
        });
      }
    }

    candidates.sort(
      (a, b) =>
        a.distance - b.distance ||
        a.gridZ - b.gridZ ||
        a.gridX - b.gridX,
    );

    const available =
      candidates.find(
        (candidate) =>
          validateMarsPlacement(
            {
              buildingId: null,

              buildingKey:
                definition.building_key,

              gridX:
                candidate.gridX,

              gridZ:
                candidate.gridZ,

              rotationY: 0,

              footprintWidth:
                targetWidth,

              footprintDepth:
                targetDepth,
            },

            physicalBuildings,
            {
              min: mapMin,
              max: mapMax,
            },
          ).valid,
      );

    return {
      gridX:
        available?.gridX ??
        mapMin,

      gridZ:
        available?.gridZ ??
        mapMin,

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
    marsGridToWorld(
      placement.gridX,
      placement.gridZ,
      width,
      depth,
    );

  /*
   * Immediate client-side validation.
   *
   * This is UX validation only.
   * Supabase remains the final server-authoritative validator.
   *
   * buildingId is NULL because inventory placement creates
   * a brand-new physical building instance.
   */
  const validation =
    validateMarsPlacement(
      {
        buildingId: null,
        buildingKey:
          definition.building_key,
        gridX:
          placement.gridX,
        gridZ:
          placement.gridZ,
        rotationY:
          placement.rotationY,
        footprintWidth:
          definition.footprint_width,
        footprintDepth:
          definition.footprint_depth,
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

    const groundPoint =
      new THREE.Vector3();

    const groundPlane =
      new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        0,
      );

    const intersection =
      event.ray.intersectPlane(
        groundPlane,
        groundPoint,
      );

    if (!intersection) {
      return;
    }

    const next =
      marsWorldToGrid(
        groundPoint.x,
        groundPoint.z,
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

    /*
     * Reject locally invalid placement before RPC.
     *
     * This does NOT replace server validation.
     * Server remains authoritative.
     */
    if (!validation.valid) {
      setSaveError(true);
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
        onPointerDown={
          handlePointerDown
        }
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

      <MarsPlacementGrid
            mapMin={mapMin}
            mapMax={mapMax}
          />

      {/*
       * Authoritative footprint preview.
       * This is placement UI, not a fake production model.
       */}
      <MarsPlacementPreview
        worldX={world.x}
        worldZ={world.z}
        footprintWidth={width}
        footprintDepth={depth}
        valid={validation.valid}
        error={saveError}
        mode="place"
      />

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
      >
        <MarsColonyBuildingModel
          buildingKey={
            definition.building_key
          }
          preview
        />
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
            disabled={
              saving ||
              !validation.valid
            }
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

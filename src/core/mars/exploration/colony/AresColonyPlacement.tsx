import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Html,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  getMyMarsColonyBase,
  type MarsColonyBaseBuilding,
  type MarsColonyRotation,
} from "../../MarsColonyBaseService";

import {
  placeMyMarsInventoryBuilding,
  type MarsInventoryItem,
} from "../../MarsMarketService";

import {
  getMarsCommandHubProgressionForColony,
  type MarsCommandHubProgression,
} from "../../MarsCommandHubProgressionService";

import {
  createVerifiedMarsBuildingInstances,
} from "../../colonyworld/engine/MarsBuildingAdapter";

import {
  marsGridToWorld,
  validateMarsPlacement,
} from "../../colonyworld/engine";

import MarsColonyBuildingModel from "../../colonyworld/models/MarsColonyBuildingModel";

import {
  ARES_COMMAND_HUB_POSITION,
} from "../commandhub/AresCommandHubCollision";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

type Props = {
  item: MarsInventoryItem;
  colonyId: string;
  definition: MarsColonyBaseBuilding;
  targetRef: React.RefObject<THREE.Group | null>;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

type Placement = {
  gridX: number;
  gridZ: number;
  rotationY: MarsColonyRotation;
};

function gridWorldPosition(
  gridX: number,
  gridZ: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  const local =
    marsGridToWorld(
      gridX,
      gridZ,
      footprintWidth,
      footprintDepth,
    );

  return {
    x:
      ARES_COMMAND_HUB_POSITION.x +
      local.x,
    z:
      ARES_COMMAND_HUB_POSITION.z +
      local.z,
  };
}

export default function AresColonyPlacement({
  item,
  colonyId,
  definition,
  targetRef,
  onCancel,
  onSaved,
}: Props) {
  const normalizedBuildingKey =
    definition.building_key
      .trim()
      .toLowerCase();

  const productionVisualSupported =
    normalizedBuildingKey.includes(
      "energy",
    ) ||
    normalizedBuildingKey.includes(
      "water",
    ) ||
    normalizedBuildingKey.includes(
      "science",
    ) ||
    normalizedBuildingKey.includes(
      "habitat",
    );
  const [
    terrain,
    setTerrain,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

  const [
    progression,
    setProgression,
  ] =
    useState<MarsCommandHubProgression | null>(
      null,
    );

  const [
    buildings,
    setBuildings,
  ] =
    useState<MarsColonyBaseBuilding[]>(
      [],
    );

  const [
    placement,
    setPlacement,
  ] =
    useState<Placement | null>(
      null,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    const terrainRequest =
      loadAresGenesisTerrainData().then(
        (value) => {
          return value;
        },
      );

    const progressionRequest =
      getMarsCommandHubProgressionForColony(
        colonyId,
      ).then((value) => {
        return value;
      });

    const colonyRequest =
      getMyMarsColonyBase().then(
        (value) => {
          return value;
        },
      );

    Promise.all([
      terrainRequest,
      progressionRequest,
      colonyRequest,
    ])
      .then(
        ([
          terrainData,
          progressionData,
          buildingRows,
        ]) => {
          if (!active) {
            return;
          }

          setTerrain(
            terrainData,
          );

          setProgression(
            progressionData,
          );

          setBuildings(
            buildingRows,
          );
        },
      )
      .catch((loadError) => {
        console.error(
          "Failed to prepare Ares colony placement",
          loadError,
        );

        if (active) {
          setError(
            "PLACEMENT SYSTEM UNAVAILABLE",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [colonyId]);

  const physicalBuildings =
    useMemo(
      () =>
        createVerifiedMarsBuildingInstances(
          buildings,
        ),
      [buildings],
    );

  useEffect(() => {
    if (
      !progression ||
      placement
    ) {
      return;
    }

    const footprintWidth =
      Math.max(
        definition.footprint_width,
        1,
      );

    const footprintDepth =
      Math.max(
        definition.footprint_depth,
        1,
      );

    const candidates: Array<{
      gridX: number;
      gridZ: number;
      distance: number;
    }> = [];

    for (
      let gridZ = progression.map_min;
      gridZ <=
      progression.map_max -
        footprintDepth +
        1;
      gridZ += 1
    ) {
      for (
        let gridX = progression.map_min;
        gridX <=
        progression.map_max -
          footprintWidth +
          1;
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
              footprintWidth,
              footprintDepth,
            },
            physicalBuildings,
            {
              min:
                progression.map_min,
              max:
                progression.map_max,
            },
          ).valid,
      );

    if (!available) {
      setError(
        "NO AVAILABLE BUILDING SPACE",
      );
      return;
    }

    setPlacement({
      gridX:
        available.gridX,
      gridZ:
        available.gridZ,
      rotationY: 0,
    });
  }, [
    definition,
    physicalBuildings,
    placement,
    progression,
  ]);

  const rotated =
    placement?.rotationY === 90 ||
    placement?.rotationY === 270;

  const width =
    rotated
      ? definition.footprint_depth
      : definition.footprint_width;

  const depth =
    rotated
      ? definition.footprint_width
      : definition.footprint_depth;

  const validation =
    progression &&
    placement
      ? validateMarsPlacement(
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
            min:
              progression.map_min,
            max:
              progression.map_max,
          },
        )
      : {
          valid: false,
          codes: [],
        };

  const world =
    placement
      ? gridWorldPosition(
          placement.gridX,
          placement.gridZ,
          width,
          depth,
        )
      : {
          x:
            ARES_COMMAND_HUB_POSITION.x,
          z:
            ARES_COMMAND_HUB_POSITION.z,
        };

  const terrainY =
    terrain
      ? sampleAresGenesisGameplaySurfaceMeters(
          terrain,
          world.x,
          world.z,
        )
      : 0;

  const [
    builderDistanceFromPreview,
    setBuilderDistanceFromPreview,
  ] = useState(Number.POSITIVE_INFINITY);

  useFrame(() => {
    const target =
      targetRef.current;

    if (
      !target ||
      !placement
    ) {
      return;
    }

    const nextDistance =
      Math.hypot(
        target.position.x -
          world.x,
        target.position.z -
          world.z,
      );

    setBuilderDistanceFromPreview(
      (current) =>
        !Number.isFinite(current) ||
        Math.abs(
          current -
            nextDistance,
        ) >= 0.2
          ? nextDistance
          : current,
    );
  });

  const builderNearPlacement =
    builderDistanceFromPreview <= 18;

  function move(
    dx: number,
    dz: number,
  ) {
    if (
      !progression ||
      !placement ||
      saving
    ) {
      return;
    }

    setError(null);

    setPlacement(
      (current) =>
        current
          ? {
              ...current,
              gridX:
                THREE.MathUtils.clamp(
                  current.gridX + dx,
                  progression.map_min,
                  progression.map_max -
                    width +
                    1,
                ),
              gridZ:
                THREE.MathUtils.clamp(
                  current.gridZ + dz,
                  progression.map_min,
                  progression.map_max -
                    depth +
                    1,
                ),
            }
          : current,
    );
  }

  function rotate() {
    if (
      saving ||
      !placement
    ) {
      return;
    }

    setError(null);

    setPlacement(
      (current) =>
        current
          ? {
              ...current,
              rotationY:
                (
                  (current.rotationY + 90) %
                  360
                ) as MarsColonyRotation,
            }
          : current,
    );
  }

  async function confirm() {
    if (
      saving ||
      !progression ||
      !terrain ||
      !placement ||
      !validation.valid
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await placeMyMarsInventoryBuilding(
        item.item_key,
        placement.gridX,
        placement.gridZ,
        placement.rotationY,
      );

      await onSaved();
    } catch (saveError) {
      console.error(
        "Ares colony placement failed",
        saveError,
      );

      setError(
        "SERVER REJECTED PLACEMENT",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!productionVisualSupported) {
    return (
      <Html
        fullscreen
        style={{
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "28px",
            transform:
              "translateX(-50%)",
            padding:
              "10px 14px",
            border:
              "1px solid rgba(255,118,95,.4)",
            borderRadius: "10px",
            background:
              "rgba(5,7,18,.92)",
            color: "#ff765f",
            fontFamily:
              "Inter, system-ui, sans-serif",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: ".1em",
          }}
        >
          BUILDING VISUAL NOT AVAILABLE
        </div>
      </Html>
    );
  }

  if (
    !terrain ||
    !progression ||
    !placement
  ) {
    return null;
  }

  if (!builderNearPlacement) {
    return (
      <>
        <group
          position={[
            world.x,
            terrainY + 0.06,
            world.z,
          ]}
        >
          <mesh
            rotation={[
              -Math.PI / 2,
              0,
              0,
            ]}
          >
            <ringGeometry
              args={[
                1.35,
                1.75,
                48,
              ]}
            />
            <meshBasicMaterial
              color="#63f5ff"
              transparent
              opacity={0.82}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          <mesh
            position={[
              0,
              0.08,
              0,
            ]}
            rotation={[
              -Math.PI / 2,
              0,
              0,
            ]}
          >
            <ringGeometry
              args={[
                0.42,
                0.58,
                32,
              ]}
            />
            <meshBasicMaterial
              color="#d28cff"
              transparent
              opacity={0.9}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        <Html
          fullscreen
          style={{
            pointerEvents: "none",
          }}
        >
          <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "24px",
            transform: "translateX(-50%)",
            zIndex: 220,
            pointerEvents: "auto",
            minWidth: "270px",
            padding: "13px 15px",
            border:
              "1px solid rgba(99,245,255,.32)",
            borderRadius: "12px",
            background:
              "rgba(5,7,18,.94)",
            color: "#fff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#63f5ff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: ".16em",
            }}
          >
            COLONY PLACEMENT
          </div>

          <strong
            style={{
              display: "block",
              marginTop: "7px",
              fontSize: "12px",
            }}
          >
            MOVE TO BUILD AREA
          </strong>

          <div
            style={{
              marginTop: "6px",
              color: "rgba(255,255,255,.62)",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {Number.isFinite(
              builderDistanceFromPreview,
            )
              ? `${Math.ceil(
                  builderDistanceFromPreview,
                )} M TO BUILD AREA`
              : "LOCATING BUILD AREA"}
          </div>

          <button
            type="button"
            onClick={onCancel}
            style={{
              marginTop: "10px",
              width: "100%",
            }}
          >
            CANCEL
          </button>
          </div>
        </Html>
      </>
    );
  }

  return (
    <>
      <mesh
        position={[
          world.x,
          terrainY + 0.035,
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
            width * 1.35 * 0.96,
            depth * 1.35 * 0.96,
          ]}
        />
        <meshBasicMaterial
          color={
            validation.valid && !error
              ? "#d28cff"
              : "#ff334f"
          }
          transparent
          opacity={
            validation.valid && !error
              ? 0.32
              : 0.44
          }
          depthWrite={false}
        />
      </mesh>

      <group
        position={[
          world.x,
          terrainY + 0.05,
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
        <Suspense fallback={null}>
          <MarsColonyBuildingModel
            buildingKey={
              definition.building_key
            }
            preview
          />
        </Suspense>
      </group>

      <Html
        fullscreen
        style={{
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "24px",
            transform: "translateX(-50%)",
            zIndex: 220,
            pointerEvents: "auto",
          }}
        >
        <div
          style={{
            minWidth: "250px",
            padding: "12px",
            border:
              "1px solid rgba(99,245,255,.32)",
            borderRadius: "12px",
            background:
              "rgba(5,7,18,.92)",
            color: "#fff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#63f5ff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: ".16em",
            }}
          >
            COLONY PLACEMENT
          </div>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              fontSize: "13px",
            }}
          >
            {item.item_name}
          </strong>

          <div
            style={{
              marginTop: "10px",
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                move(-1, 0)
              }
            >
              ←
            </button>

            <button
              type="button"
              onClick={() =>
                move(0, -1)
              }
            >
              ↑
            </button>

            <button
              type="button"
              onClick={() =>
                move(1, 0)
              }
            >
              →
            </button>

            <button
              type="button"
              onClick={() =>
                move(0, 1)
              }
            >
              ↓
            </button>

            <button
              type="button"
              onClick={rotate}
            >
              ROTATE
            </button>

            <button
              type="button"
              onClick={confirm}
              disabled={
                saving ||
                !validation.valid
              }
            >
              {saving
                ? "SAVING"
                : "PLACE"}
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              marginTop: "7px",
              width: "100%",
            }}
          >
            CANCEL
          </button>

          {!validation.valid && (
            <div
              style={{
                marginTop: "7px",
                color: "#ff765f",
                fontSize: "9px",
                fontWeight: 800,
              }}
            >
              INVALID PLACEMENT
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "7px",
                color: "#ff765f",
                fontSize: "9px",
                fontWeight: 800,
              }}
            >
              {error}
            </div>
          )}
        </div>
        </div>
      </Html>
    </>
  );
}

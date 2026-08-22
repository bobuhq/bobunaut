import {
  Canvas,
  type ThreeEvent,
} from "@react-three/fiber";

import {
  ContactShadows,
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
  MarsCommandHubModel,
} from "../MarsCommandHub3D";

import "./MarsColonyWorld3D.css";


type Props = {
  buildings: MarsColonyBaseBuilding[];
  canManageColony?: boolean;
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
    if (!dragging) {
      setPlacement(
        initialPlacement,
      );
    }
  }, [
    dragging,
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


  async function savePlacement() {
    if (
      !canManageColony ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setSaveError(false);

    try {
      const result =
        await moveMyMarsColonyBuilding(
          building.building_key,
          placement.gridX,
          placement.gridZ,
          placement.rotationY,
        );

      setPlacement({
        gridX:
          result.grid_x,

        gridZ:
          result.grid_z,

        rotationY:
          result.rotation_y,
      });
    } catch (error) {
      console.error(
        "Mars building placement failed:",
        error,
      );

      setPlacement(
        initialPlacement,
      );

      setSaveError(true);
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


  async function handlePointerUp(
    event: ThreeEvent<PointerEvent>,
  ) {
    if (!dragging) {
      return;
    }

    event.stopPropagation();

    setDragging(false);

    document.body.style.cursor =
      "";

    await savePlacement();
  }


  return (
    <>
      {/* Large invisible interaction field */}
      {dragging && (
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
          />
        </mesh>
      )}


      {/* Placement footprint */}
      {dragging && (
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
      >
        <MarsCommandHubModel
          level={
            building.building_level
          }
        />
      </group>


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


function ColonyScene({
  buildings,
  canManageColony,
}: Required<Props>) {
  const commandHub =
    buildings.find(
      (building) =>
        building.building_key ===
          "command_hub" &&
        building.built,
    );


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

      <PlacementGrid />

      {commandHub && (
        <CommandHub
          building={commandHub}
          canManageColony={
            canManageColony
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
            12,
            15,
            12,
          ],
          zoom: 41,
          near: 0.1,
          far: 120,
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

import {
  Canvas,
  useThree,
} from "@react-three/fiber";

import {
  ContactShadows,
  MapControls,
  useTexture,
} from "@react-three/drei";

import {
  Suspense,
  useEffect,
  useMemo,
} from "react";

import * as THREE from "three";

import type {
  MarsColonyBaseBuilding,
} from "../MarsColonyBaseService";

import {
  MarsCommandHubModel,
} from "../MarsCommandHub3D";

import "./MarsColonyWorld3D.css";


type Props = {
  buildings: MarsColonyBaseBuilding[];
};


const GRID_UNIT = 1.55;
const MAP_MIN = -12;
const MAP_MAX = 12;
const MAP_CELLS =
  MAP_MAX - MAP_MIN + 1;

const TERRAIN_SIZE =
  MAP_CELLS * GRID_UNIT;


/*
 * DB grid coordinates represent the minimum occupied cell.
 * Three.js objects need the visual center of that footprint.
 */
function placementToWorld(
  building: MarsColonyBaseBuilding,
) {
  const gridX =
    building.grid_x ?? 0;

  const gridZ =
    building.grid_z ?? 0;

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

  const centerGridX =
    gridX + (width - 1) / 2;

  const centerGridZ =
    gridZ + (depth - 1) / 2;

  return {
    x: centerGridX * GRID_UNIT,
    z: centerGridZ * GRID_UNIT,
  };
}


function MarsTerrain() {
  const texture = useTexture(
    "/images/mars/nasa-mars-world.jpg",
  );

  const { gl } = useThree();

  useEffect(() => {
    texture.colorSpace =
      THREE.SRGBColorSpace;

    texture.wrapS =
      THREE.ClampToEdgeWrapping;

    texture.wrapT =
      THREE.ClampToEdgeWrapping;

    texture.anisotropy =
      Math.min(
        12,
        gl.capabilities.getMaxAnisotropy(),
      );

    texture.needsUpdate = true;
  }, [gl, texture]);

  return (
    <group>
      {/* Physical Mars ground */}
      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        receiveShadow
      >
        <planeGeometry
          args={[
            TERRAIN_SIZE,
            TERRAIN_SIZE,
            1,
            1,
          ]}
        />

        <meshStandardMaterial
          map={texture}
          color="#b56b49"
          roughness={0.94}
          metalness={0}
        />
      </mesh>

      {/* Very subtle operational grid */}
      <gridHelper
        args={[
          TERRAIN_SIZE,
          MAP_CELLS,
          new THREE.Color(
            "#b179d9",
          ),
          new THREE.Color(
            "#774d57",
          ),
        ]}
        position={[
          0,
          0.025,
          0,
        ]}
      />
    </group>
  );
}


function CommandHub({
  building,
}: {
  building: MarsColonyBaseBuilding;
}) {
  const position =
    useMemo(
      () =>
        placementToWorld(
          building,
        ),
      [building],
    );

  const rotation =
    THREE.MathUtils.degToRad(
      building.rotation_y,
    );

  return (
    <group
      position={[
        position.x,
        0.08,
        position.z,
      ]}
      rotation={[
        0,
        rotation,
        0,
      ]}
      scale={0.78}
    >
      <MarsCommandHubModel
        level={building.building_level}
      />
    </group>
  );
}


function ColonyStructures({
  buildings,
}: Props) {
  const builtBuildings =
    useMemo(
      () =>
        buildings.filter(
          (building) =>
            building.built &&
            building.grid_x !== null &&
            building.grid_z !== null,
        ),
      [buildings],
    );

  return (
    <>
      {builtBuildings.map(
        (building) => {
          /*
           * V1 only renders structures that already have
           * a real Three.js production model.
           *
           * Other building types remain in the existing
           * UI until their actual 3D models are created.
           * No fake geometry is introduced here.
           */
          if (
            building.building_key ===
            "command_hub"
          ) {
            return (
              <CommandHub
                key={
                  building.building_key
                }
                building={building}
              />
            );
          }

          return null;
        },
      )}
    </>
  );
}


function ColonyScene({
  buildings,
}: Props) {
  return (
    <>
      <ambientLight
        intensity={0.52}
        color="#9fa9ba"
      />

      <hemisphereLight
        intensity={0.72}
        color="#d8e3f0"
        groundColor="#632f1d"
      />

      {/* Mars sunlight */}
      <directionalLight
        castShadow
        position={[
          14,
          22,
          12,
        ]}
        intensity={3.4}
        color="#ffd3a2"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />

      {/* BOBU violet fill */}
      <directionalLight
        position={[
          -12,
          10,
          -10,
        ]}
        intensity={0.72}
        color="#8048ff"
      />

      <MarsTerrain />

      <ColonyStructures
        buildings={buildings}
      />

      <ContactShadows
        position={[0, 0.045, 0]}
        opacity={0.42}
        scale={42}
        blur={2.4}
        far={18}
        resolution={1024}
        color="#24100b"
      />

      {/*
       * Clash-of-Clans style interaction:
       *
       * LEFT DRAG = pan
       * WHEEL = zoom
       * TOUCH 1 = pan
       * TOUCH 2 = pinch zoom + pan
       *
       * Camera rotation stays locked.
       */}
      <MapControls
        makeDefault
        enableRotate={false}
        enablePan
        enableZoom
        enableDamping
        dampingFactor={0.075}
        zoomSpeed={0.85}
        panSpeed={0.9}
        minZoom={23}
        maxZoom={68}
        screenSpacePanning={false}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.PAN,
          TWO:
            THREE.TOUCH.DOLLY_PAN,
        }}
        minPolarAngle={
          Math.PI / 3
        }
        maxPolarAngle={
          Math.PI / 3
        }
        target={[0, 0, 0]}
      />
    </>
  );
}


export function MarsColonyWorld3D({
  buildings,
}: Props) {
  return (
    <div
      className="mars-colony-world-3d"
      role="region"
      aria-label="Mars Colony 3D World"
    >
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: [
            23,
            25,
            23,
          ],
          zoom: 35,
          near: 0.1,
          far: 150,
        }}
        gl={{
          alpha: false,
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
            1.06;

          gl.setClearColor(
            "#30160f",
            1,
          );
        }}
      >
        <Suspense fallback={null}>
          <ColonyScene
            buildings={buildings}
          />
        </Suspense>
      </Canvas>

      <div
        className="mars-colony-world-3d__hint"
        aria-hidden="true"
      >
        <span>DRAG TO MOVE</span>
        <span>SCROLL TO ZOOM</span>
      </div>
    </div>
  );
}

import {
  Suspense,
  useRef,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import {
  Stars,
} from "@react-three/drei";

import * as THREE from "three";

import {
  BobuCharacterController,
} from "./components/BobuCharacterController";

import {
  BobuCharacterVisual,
} from "./components/BobuCharacterVisual";

import {
  MarsExplorationTerrain,
} from "./components/MarsExplorationTerrain";

import {
  MarsSurfaceRocks,
  MARS_SURFACE_ROCK_COLLISION_OBSTACLES,
} from "./components/MarsSurfaceRocks";

import {
  MarsFollowCamera,
} from "./components/MarsFollowCamera";

import {
  MarsDiscoveryPoint,
} from "./components/MarsDiscoveryPoint";

function MarsExploreScene() {
  const bobuRef =
    useRef<THREE.Group | null>(
      null,
    );

  return (
    <>
      <color
        attach="background"
        args={["#120805"]}
      />

      <fog
        attach="fog"
        args={[
          "#5c2418",
          1800,
          9000,
        ]}
      />

      <hemisphereLight
        args={[
          "#c98b70",
          "#170706",
          0.38,
        ]}
      />

      <directionalLight
        position={[
          -140,
          34,
          90,
        ]}
        intensity={2.65}
        color="#ffd7bd"
        castShadow
      />

      <MarsExplorationTerrain />
      <MarsSurfaceRocks />

      <MarsDiscoveryPoint
        targetRef={bobuRef}
        position={[
          18,
          -28,
        ]}
      />

      <BobuCharacterController
        characterRef={bobuRef}
        startPosition={[
          0,
          0,
          0,
        ]}
        collisionObstacles={[
          ...MARS_SURFACE_ROCK_COLLISION_OBSTACLES,
          {
            x: 18,
            z: -28,
            radius: 1.35,
          },
        ]}
      >
        <BobuCharacterVisual />
      </BobuCharacterController>

      <MarsFollowCamera
        targetRef={bobuRef}
      />

      <Stars
        radius={80}
        depth={30}
        count={900}
        factor={2.2}
        saturation={0.15}
        fade
        speed={0.08}
      />
    </>
  );
}

export function MarsExploreWorld() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#050712",
        overflow: "hidden",
      }}
    >
      <a
        className="mars-explore-return-button"
        href="/mars"
        aria-label="Return to Mars orbit"
      >
        <span aria-hidden="true">←</span>
        <span>RETURN TO ORBIT</span>
      </a>

      <Canvas
        shadows
        camera={{
          position: [
            0,
            4.2,
            7.5,
          ],
          fov: 48,
          near: 0.1,
          far: 20000,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference:
            "high-performance",
        }}
      >
        <Suspense
          fallback={null}
        >
          <MarsExploreScene />
        </Suspense>
      </Canvas>
    </div>
  );
}

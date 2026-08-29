import {
  Suspense,
  useEffect,
  useRef,
  useState,
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

import {
  useAuthSession,
} from "../../auth/useAuthSession";

import {
  useBuilderStore,
} from "../../../features/identity/hooks/useBuilderStore";

import {
  AresMultiplayerPresence,
} from "./multiplayer/AresMultiplayerPresence";

import {
  AresCommandHub,
} from "./commandhub/AresCommandHub";

import {
  ARES_COMMAND_HUB_COLLISION_OBSTACLES,
} from "./commandhub/AresCommandHubCollision";

import {
  AresHiddenMissionBeacon,
} from "./missions/AresHiddenMissionBeacon";

import {
  getMyAresHiddenMission,
  type AresHiddenMission,
} from "./missions/AresHiddenMissionService";

interface MarsExploreSceneProps {
  builderId: string;
  displayName:
    | string
    | null
    | undefined;
  onOnlineCountChange: (
    count: number,
  ) => void;
}

function MarsExploreScene({
  builderId,
  displayName,
  onOnlineCountChange,
}: MarsExploreSceneProps) {
  const bobuRef =
    useRef<THREE.Group | null>(
      null,
    );

  const [
    hiddenMission,
    setHiddenMission,
  ] =
    useState<AresHiddenMission | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    getMyAresHiddenMission()
      .then(
        (
          mission,
        ) => {
          if (
            active
          ) {
            setHiddenMission(
              mission,
            );
          }
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "Failed to restore Ares hidden mission",
            error,
          );
        },
      );

    return () => {
      active = false;
    };
  }, []);

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
      <AresCommandHub
        targetRef={bobuRef}
        onMission={setHiddenMission}
      />

      {hiddenMission && (
        <AresHiddenMissionBeacon
          mission={hiddenMission}
        />
      )}

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
          ...ARES_COMMAND_HUB_COLLISION_OBSTACLES,
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

      <AresMultiplayerPresence
        characterRef={bobuRef}
        builderId={builderId}
        displayName={displayName}
        onOnlineCountChange={
          onOnlineCountChange
        }
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
  const {
    session,
  } = useAuthSession();

  const builder =
    useBuilderStore();

  const [
    onlineCount,
    setOnlineCount,
  ] =
    useState(1);

  const builderId =
    session?.user.id ?? "";

  const displayName =
    builder?.username?.trim() ||
    (builder?.id
      ? `Builder ${builder.id.slice(0, 6)}`
      : null);

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

      <div
        style={{
          position: "absolute",
          top: "18px",
          right: "18px",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          border: "1px solid rgba(99,245,255,0.24)",
          borderRadius: "999px",
          background: "rgba(5,7,18,0.68)",
          color: "#ffffff",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.12em",
          pointerEvents: "none",
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#63f5ff",
            boxShadow: "0 0 10px rgba(99,245,255,0.9)",
          }}
        />
        ARES ONLINE {onlineCount}
      </div>

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
          {builderId && (
            <MarsExploreScene
              builderId={builderId}
              displayName={
                displayName
              }
              onOnlineCountChange={
                setOnlineCount
              }
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

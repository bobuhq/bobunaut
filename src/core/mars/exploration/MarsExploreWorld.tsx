import {
  Suspense,
  useCallback,
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

import {
  AresGuidanceSystem,
  type AresGuidanceNavigation,
} from "./guidance/AresGuidanceSystem";

import {
  marsAudio,
} from "./audio/MarsAudioEngine";


interface MarsExploreSceneProps {
  builderId: string;
  displayName:
    | string
    | null
    | undefined;
  onOnlineCountChange: (
    count: number,
  ) => void;

  onHiddenMissionNavigationChange:
    (
      navigation:
        AresGuidanceNavigation | null,
    ) => void;
}

function MarsExploreScene({
  builderId,
  displayName,
  onOnlineCountChange,
  onHiddenMissionNavigationChange,
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

  const ignoreBeaconNavigation =
    useCallback(
      () => {},
      [],
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
      <AresGuidanceSystem
        targetRef={bobuRef}
        mission={hiddenMission}
        onNavigation={
          onHiddenMissionNavigationChange
        }
      />

      <AresCommandHub
        targetRef={bobuRef}
        onMission={setHiddenMission}
      />

      {hiddenMission &&
        hiddenMission.status ===
          "accepted" && (
        <AresHiddenMissionBeacon
          mission={hiddenMission}
          targetRef={bobuRef}
          onNavigation={
            ignoreBeaconNavigation
          }
          onCompleted={() => {
            onHiddenMissionNavigationChange(
              null,
            );

            setHiddenMission(
              (
                current,
              ) =>
                current
                  ? {
                      ...current,
                      status:
                        "claimed",
                    }
                  : current,
            );
          }}
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

  const [
    hiddenMissionNavigation,
    setHiddenMissionNavigation,
  ] =
    useState<AresGuidanceNavigation | null>(
      null,
    );

  const [
    onboardingVisible,
    setOnboardingVisible,
  ] = useState(true);

  const [
    soundEnabled,
    setSoundEnabled,
  ] = useState(true);

  const handleHiddenMissionNavigationChange =
    useCallback(
      (
        navigation:
          AresGuidanceNavigation | null,
      ) => {
        setHiddenMissionNavigation(
          navigation,
        );
      },
      [],
    );

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      void marsAudio.unlock();

      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(
          event.code,
        )
      ) {
        marsAudio.step(
          event.shiftKey,
        );
      }

      if (
        event.code === "Space" &&
        !event.repeat
      ) {
        marsAudio.jump();
      }

      if (
        event.code === "KeyE" &&
        !event.repeat
      ) {
        marsAudio.interact();
      }

      setOnboardingVisible(
        false,
      );
    }

    function handlePointerDown() {
      void marsAudio.unlock();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, []);

  const toggleSound =
    useCallback(() => {
      setSoundEnabled(
        (
          current,
        ) => {
          const next =
            !current;

          marsAudio.setEnabled(
            next,
          );

          if (next) {
            void marsAudio.unlock();
          }

          return next;
        },
      );
    }, []);

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

      <button
        type="button"
        onClick={toggleSound}
        aria-label={
          soundEnabled
            ? "Mute Mars audio"
            : "Enable Mars audio"
        }
        style={{
          position: "fixed",
          top: "18px",
          right: "150px",
          zIndex: 100,
          width: "34px",
          height: "34px",
          border:
            "1px solid rgba(255,255,255,.15)",
          borderRadius: "50%",
          background:
            "rgba(5,7,18,.78)",
          color:
            soundEnabled
              ? "#8dffad"
              : "#8a8d96",
          cursor: "pointer",
          backdropFilter:
            "blur(12px)",
          fontSize: "15px",
        }}
      >
        {soundEnabled
          ? "♪"
          : "×"}
      </button>

      {onboardingVisible && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 90,
            width:
              "min(520px, calc(100vw - 48px))",
            padding:
              "14px 17px",
            border:
              "1px solid rgba(99,245,255,.26)",
            borderRadius:
              "14px",
            background:
              "rgba(5,10,20,.88)",
            boxShadow:
              "0 14px 50px rgba(0,0,0,.3)",
            backdropFilter:
              "blur(14px)",
            color: "#fff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            pointerEvents:
              "none",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing:
                ".21em",
              color: "#63f5ff",
            }}
          >
            ARES EXPLORATION PROTOCOL
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "17px",
              fontWeight: 900,
            }}
          >
            FOLLOW THE OBJECTIVE MARKER
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "7px",
              marginTop: "11px",
            }}
          >
            {[
              "WASD MOVE",
              "SHIFT RUN",
              "SPACE JUMP",
              "DRAG CAMERA",
              "E INTERACT",
            ].map(
              (
                item,
              ) => (
                <span
                  key={item}
                  style={{
                    padding:
                      "5px 8px",
                    border:
                      "1px solid rgba(255,255,255,.1)",
                    borderRadius:
                      "6px",
                    background:
                      "rgba(255,255,255,.045)",
                    color:
                      "rgba(255,255,255,.72)",
                    fontSize:
                      "8px",
                    fontWeight:
                      800,
                    letterSpacing:
                      ".08em",
                  }}
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {hiddenMissionNavigation && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "26px",
            transform:
              "translateX(-50%)",
            zIndex:
              2147483647,
            display: "flex",
            alignItems:
              "center",
            gap: "13px",
            minWidth:
              "320px",
            padding:
              "11px 15px",
            border:
              hiddenMissionNavigation.kind ===
              "mission"
                ? "1px solid rgba(196,126,255,.58)"
                : "1px solid rgba(99,245,255,.42)",
            borderRadius:
              "14px",
            background:
              "rgba(4,7,15,.9)",
            boxShadow:
              "0 12px 38px rgba(0,0,0,.25)",
            backdropFilter:
              "blur(14px)",
            color: "#fff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            pointerEvents:
              "none",
          }}
        >
          <div
            style={{
              width: "43px",
              height: "43px",
              display: "grid",
              placeItems:
                "center",
              flexShrink: 0,
              borderRadius:
                "50%",
              border:
                hiddenMissionNavigation.kind ===
                "mission"
                  ? "1px solid rgba(204,143,255,.45)"
                  : "1px solid rgba(99,245,255,.45)",
              background:
                "rgba(255,255,255,.035)",
            }}
          >
            <span
              style={{
                display: "block",
                color:
                  hiddenMissionNavigation.kind ===
                  "mission"
                    ? "#d8a8ff"
                    : "#63f5ff",
                fontSize: "21px",
                lineHeight: 1,
                textShadow:
                  "0 0 15px currentColor",
                transform:
                  hiddenMissionNavigation.kind ===
                  "explore"
                    ? "none"
                    : `rotate(${hiddenMissionNavigation.relativeAngle}deg)`,
                transition:
                  "transform .1s linear",
              }}
            >
              {hiddenMissionNavigation.kind ===
              "explore"
                ? "◎"
                : "▲"}
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing:
                  ".2em",
                color:
                  hiddenMissionNavigation.kind ===
                  "mission"
                    ? "#d5a1ff"
                    : "#63f5ff",
              }}
            >
              {hiddenMissionNavigation.kind ===
              "mission"
                ? "HIDDEN ARES SIGNAL"
                : hiddenMissionNavigation.kind ===
                    "terminal"
                  ? "MISSION TERMINAL"
                  : hiddenMissionNavigation.kind ===
                      "explore"
                    ? "ARES EXPLORATION"
                    : "PRIMARY OBJECTIVE"}
            </div>

            <div
              style={{
                display: "flex",
                alignItems:
                  "baseline",
                gap: "9px",
                marginTop: "3px",
              }}
            >
              <strong
                style={{
                  fontSize: "15px",
                }}
              >
                {hiddenMissionNavigation.kind ===
                "mission"
                  ? hiddenMissionNavigation.near
                    ? "SCAN SIGNAL"
                    : "FOLLOW SIGNAL"
                  : hiddenMissionNavigation.kind ===
                      "terminal"
                    ? hiddenMissionNavigation.near
                      ? "ACCESS TERMINAL"
                      : "FIND MISSION TERMINAL"
                    : hiddenMissionNavigation.kind ===
                        "explore"
                      ? "EXPLORE ARES"
                      : hiddenMissionNavigation.near
                        ? "ENTER COMMAND HUB"
                        : "REACH COMMAND HUB"}
              </strong>

              {hiddenMissionNavigation.kind !==
                "explore" && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    color:
                      "rgba(255,255,255,.7)",
                  }}
                >
                  {Math.round(
                    hiddenMissionNavigation.distance,
                  )} M
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "8px",
                fontWeight: 800,
                letterSpacing:
                  ".1em",
                color:
                  "rgba(255,255,255,.5)",
              }}
            >
              {hiddenMissionNavigation.kind ===
                "explore"
                ? "SEARCH FOR SIGNALS AND ANOMALIES"
                : hiddenMissionNavigation.kind ===
                    "mission" &&
                  hiddenMissionNavigation.near
                  ? "HOLD E TO SCAN"
                  : hiddenMissionNavigation.kind ===
                      "terminal" &&
                    hiddenMissionNavigation.near
                    ? "PRESS E TO ACCESS"
                    : Math.abs(
                          hiddenMissionNavigation.relativeAngle,
                        ) < 14
                      ? "AHEAD"
                      : hiddenMissionNavigation.relativeAngle >
                          0
                        ? "TURN RIGHT"
                        : "TURN LEFT"}
            </div>
          </div>
        </div>
      )}

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
              onHiddenMissionNavigationChange={
                handleHiddenMissionNavigationChange
              }
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

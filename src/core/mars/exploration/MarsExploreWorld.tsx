import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  BobuCharacterController,
  type MarsAnalogMovement,
} from "./components/BobuCharacterController";

import {
  AresMobileJoystick,
  type AresJoystickVector,
} from "./components/AresMobileJoystick";

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
  useAuthSession,
} from "../../auth/useAuthSession";

import { useLanguage } from "../../language";
import MarsLanguageSelector from "../components/MarsLanguageSelector";

import {
  useBuilderStore,
} from "../../../features/identity/hooks/useBuilderStore";

import {
  builderWalletService,
} from "../../builder/services/BuilderWalletService";

import {
  getMyMarsAccess,
  type MarsAccess,
} from "../MarsAccessService";

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

import {
  AresSky,
} from "./environment/AresSky";

import {
  AresGroundDust,
} from "./environment/AresGroundDust";

import {
  AresExplorationLandmarks,
  type AresLandmarkNavigation,
} from "./landmarks/AresExplorationLandmarks";

import MarsMarket from "../../../features/MarsMarket";

import {
  getMyMarsColonyBase,
  type MarsColonyBaseBuilding,
} from "../MarsColonyBaseService";

import {
  type MarsInventoryItem,
} from "../MarsMarketService";

import AresColonyPlacement from "./colony/AresColonyPlacement";
import AresColonyBuildings from "./colony/AresColonyBuildings";

import {
  AresDiscoveryRecordPanel,
} from "./research/AresDiscoveryRecordPanel";

import type {
  AresDiscoveryRecord,
} from "./research/AresDiscoveryArchiveService";


interface MarsExploreSceneProps {
  analogMovementRef: MutableRefObject<MarsAnalogMovement>;
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

  onLandmarkNavigationChange:
    (
      navigation:
        AresLandmarkNavigation | null,
    ) => void;
  onLandmarkDiscovered: () => void;
  onMissionCompleted: () => void;
  onMissionStateChange: (
    mission: AresHiddenMission | null,
  ) => void;
  onArchiveOpenChange: (
    open: boolean,
  ) => void;
  onArchiveRecordChange: (
    record: AresDiscoveryRecord | null,
  ) => void;
  placementItem:
    | MarsInventoryItem
    | null;
  placementDefinition:
    | MarsColonyBaseBuilding
    | null;
  placementColonyId:
    | string
    | null;
  onPlacementCancel: () => void;
  onPlacementSaved: () => void | Promise<void>;
  colonyBuildingsRefreshKey: number;
}

function MarsExploreScene({
  analogMovementRef,
  builderId,
  displayName,
  onOnlineCountChange,
  onHiddenMissionNavigationChange,
  onLandmarkNavigationChange,
  onLandmarkDiscovered,
  onMissionCompleted,
  onMissionStateChange,
  onArchiveOpenChange,
  onArchiveRecordChange,
  placementItem,
  placementDefinition,
  placementColonyId,
  onPlacementCancel,
  onPlacementSaved,
  colonyBuildingsRefreshKey,
}: MarsExploreSceneProps) {
  const bobuRef =
    useRef<THREE.Group | null>(
      null,
    );

  const bobuStairStateRef =
    useRef(false);

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
            onMissionStateChange(
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
      <AresGroundDust />
      <AresExplorationLandmarks
        targetRef={bobuRef}
        onNavigation={
          onLandmarkNavigationChange
        }
        onLandmarkDiscovered={
          onLandmarkDiscovered
        }
      />
      <AresGuidanceSystem
        targetRef={bobuRef}
        mission={hiddenMission}
        onNavigation={
          onHiddenMissionNavigationChange
        }
      />

      <AresCommandHub
        targetRef={bobuRef}
        onMission={(mission) => {
          setHiddenMission(mission);
          onMissionStateChange(mission);
        }}
        mission={hiddenMission}
        onArchiveOpenChange={
          onArchiveOpenChange
        }
        onArchiveRecordChange={
          onArchiveRecordChange
        }
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
              ) => {
                const nextMission =
                  current
                    ? {
                        ...current,
                        status:
                          "claimed" as const,
                      }
                    : current;

                onMissionStateChange(
                  nextMission,
                );

                return nextMission;
              },
            );

            onMissionCompleted();
          }}
        />
      )}



      <BobuCharacterController
        characterRef={bobuRef}
        stairStateRef={
          bobuStairStateRef
        }
        analogMovementRef={
          analogMovementRef
        }
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
        <BobuCharacterVisual
          stairStateRef={
            bobuStairStateRef
          }
        />
      </BobuCharacterController>

      <MarsFollowCamera
        targetRef={bobuRef}
      />

      <AresColonyBuildings
        refreshKey={
          colonyBuildingsRefreshKey
        }
      />

      {placementItem &&
        placementDefinition &&
        placementColonyId && (
          <AresColonyPlacement
            item={placementItem}
            colonyId={placementColonyId}
            definition={
              placementDefinition
            }
            targetRef={bobuRef}
            onCancel={
              onPlacementCancel
            }
            onSaved={
              onPlacementSaved
            }
          />
        )}

      <AresMultiplayerPresence
        characterRef={bobuRef}
        builderId={builderId}
        displayName={displayName}
        onOnlineCountChange={
          onOnlineCountChange
        }
      />

      <AresSky />
    </>
  );
}

export function MarsExploreWorld() {
  const { t, language } = useLanguage();

  const analogMovementRef =
    useRef<MarsAnalogMovement>({
      x: 0,
      y: 0,
    });

  const handleJoystickMove =
    useCallback(
      (vector: AresJoystickVector) => {
        analogMovementRef.current = {
          x: vector.x,
          y: vector.y,
        };
      },
      [],
    );
  const {
    session,
  } = useAuthSession();

  const [mobileOrientation, setMobileOrientation] = useState<
    "desktop" | "portrait" | "landscape"
  >(() => {
    if (typeof window === "undefined") {
      return "desktop";
    }

    const mobile = window.matchMedia("(max-width: 900px)").matches;

    if (!mobile) {
      return "desktop";
    }

    return window.innerWidth > window.innerHeight
      ? "landscape"
      : "portrait";
  });

  useEffect(() => {
    const updateOrientation = () => {
      const mobile = window.matchMedia("(max-width: 900px)").matches;

      if (!mobile) {
        setMobileOrientation("desktop");
        return;
      }

      setMobileOrientation(
        window.innerWidth > window.innerHeight
          ? "landscape"
          : "portrait",
      );
    };

    updateOrientation();

    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  const builder =
    useBuilderStore();

  const [
    aresAccess,
    setAresAccess,
  ] =
    useState<MarsAccess | null>(
      null,
    );

  const [
    aresAccessLoading,
    setAresAccessLoading,
  ] =
    useState(true);

  const [
    aresAccessError,
    setAresAccessError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    const verifyAresAccess =
      async () => {
        try {
          setAresAccessLoading(
            true,
          );

          setAresAccessError(
            null,
          );

          const access =
            await getMyMarsAccess();

          if (active) {
            setAresAccess(
              access,
            );
          }
        } catch (error) {
          console.error(
            "ARES route access verification failed:",
            error,
          );

          if (active) {
            setAresAccess(
              null,
            );

            setAresAccessError(
              "Unable to verify Ares access.",
            );
          }
        } finally {
          if (active) {
            setAresAccessLoading(
              false,
            );
          }
        }
      };

    void verifyAresAccess();

    return () => {
      active = false;
    };
  }, []);

  const [
    onlineCount,
    setOnlineCount,
  ] =
    useState(1);

  const [
    archiveOpen,
    setArchiveOpen,
  ] = useState(false);

  const [
    archiveRecord,
    setArchiveRecord,
  ] =
    useState<AresDiscoveryRecord | null>(
      null,
    );

  const [
    hiddenMissionNavigation,
    setHiddenMissionNavigation,
  ] =
    useState<AresGuidanceNavigation | null>(
      null,
    );

  const [
    landmarkNavigation,
    setLandmarkNavigation,
  ] =
    useState<AresLandmarkNavigation | null>(
      null,
    );

  const [
    explorationMission,
    setExplorationMission,
  ] =
    useState<AresHiddenMission | null>(
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

  const [
    marketOpen,
    setMarketOpen,
  ] = useState(false);

  const [
    placementItem,
    setPlacementItem,
  ] =
    useState<MarsInventoryItem | null>(
      null,
    );

  const [
    placementDefinition,
    setPlacementDefinition,
  ] =
    useState<MarsColonyBaseBuilding | null>(
      null,
    );

  const [
    placementColonyId,
    setPlacementColonyId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    placementError,
    setPlacementError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    colonyBuildingsRefreshKey,
    setColonyBuildingsRefreshKey,
  ] = useState(0);

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

  const handleLandmarkNavigationChange =
    useCallback(
      (
        navigation:
          AresLandmarkNavigation | null,
      ) => {
        setLandmarkNavigation(
          navigation,
        );
      },
      [],
    );

  const showLandmarkNavigation =
    explorationMission?.status ===
      "claimed" &&
    landmarkNavigation !==
      null;

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

  const cancelPlacement =
    useCallback(() => {
      setPlacementItem(null);
      setPlacementDefinition(null);
      setPlacementColonyId(null);
      setPlacementError(null);
    }, []);

  const beginInventoryPlacement =
    useCallback(
      async (
        item: MarsInventoryItem,
      ) => {
        if (
          item.item_type !==
            "building" ||
          !item.building_key ||
          item.quantity <= 0
        ) {
          setPlacementError(
            "BUILDING IS NOT AVAILABLE FOR PLACEMENT",
          );
          return;
        }

        try {
          setPlacementError(null);

          const rows =
            await getMyMarsColonyBase();

          const definition =
            rows.find(
              (row) =>
                row.building_key ===
                item.building_key,
            );

          if (!definition) {
            setPlacementError(
              "BUILDING DEFINITION NOT AVAILABLE",
            );
            return;
          }

          const normalizedKey =
            definition.building_key
              .trim()
              .toLowerCase();

          const visualSupported =
            normalizedKey.includes(
              "energy",
            ) ||
            normalizedKey.includes(
              "water",
            ) ||
            normalizedKey.includes(
              "science",
            ) ||
            normalizedKey.includes(
              "habitat",
            );

          if (!visualSupported) {
            setPlacementError(
              "FINAL BUILDING VISUAL NOT AVAILABLE",
            );
            return;
          }

          if (!definition.colony_id) {
            setPlacementError(
              "COLONY NOT AVAILABLE",
            );
            return;
          }

          setPlacementDefinition(
            definition,
          );

          setPlacementColonyId(
            definition.colony_id,
          );

          setPlacementItem(
            item,
          );

          setMarketOpen(false);
          setOnboardingVisible(false);
        } catch (error) {
          console.error(
            "Failed to prepare Ares inventory placement",
            error,
          );

          setPlacementError(
            error instanceof Error
              ? error.message
              : "UNABLE TO PREPARE PLACEMENT",
          );
        }
      },
      [],
    );

  const handlePlacementSaved =
    useCallback(async () => {
      setColonyBuildingsRefreshKey(
        (current) => current + 1,
      );

      cancelPlacement();
    }, [cancelPlacement]);

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

  const [totalGp, setTotalGp] =
    useState<number | null>(null);

  const refreshGp =
    useCallback(async () => {
      if (!session?.user.id) {
        setTotalGp(null);
        return;
      }

      try {
        const wallet =
          await builderWalletService.load(
            session.user.id,
            1,
          );

        setTotalGp(wallet.totalGp);
      } catch (error) {
        console.error(
          "Failed to refresh Ares GP balance",
          error,
        );
      }
    }, [session?.user.id]);

  useEffect(() => {
    void refreshGp();
  }, [refreshGp]);

  const builderId =
    session?.user.id ?? "";

  const displayName =
    builder?.username?.trim() ||
    (builder?.id
      ? `Builder ${builder.id.slice(0, 6)}`
      : null);

  if (aresAccessLoading) {
    return (
      <div
        style={{
          display: "grid",
          width: "100%",
          height: "100vh",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 35%, #221019 0%, #080811 48%, #030409 100%)",
          color: "#ffffff",
          fontFamily:
            "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#63f5ff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: ".2em",
            }}
          >
            ARES ACCESS PROTOCOL
          </div>

          <div
            style={{
              marginTop: "12px",
              fontSize: "20px",
              fontWeight: 900,
              letterSpacing: ".06em",
            }}
          >
            VERIFYING ACCESS
          </div>
        </div>
      </div>
    );
  }

  if (
    aresAccessError ||
    !aresAccess?.unlocked
  ) {
    return (
      <div
        style={{
          display: "grid",
          width: "100%",
          height: "100vh",
          placeItems: "center",
          padding: "24px",
          background:
            "radial-gradient(circle at 50% 35%, #281015 0%, #080811 50%, #030409 100%)",
          color: "#ffffff",
          fontFamily:
            "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width:
              "min(440px, 100%)",
            padding:
              "28px 26px",
            border:
              "1px solid rgba(255,118,95,.24)",
            borderRadius:
              "18px",
            background:
              "rgba(5,7,18,.82)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,.4)",
            textAlign:
              "center",
            backdropFilter:
              "blur(16px)",
          }}
        >
          <div
            style={{
              display: "grid",
              width: "62px",
              height: "68px",
              margin: "0 auto",
              placeItems: "center",
              background:
                "linear-gradient(145deg, rgba(255,118,95,.28), rgba(126,76,255,.2))",
              clipPath:
                "polygon(25% 6.7%,75% 6.7%,100% 50%,75% 93.3%,25% 93.3%,0 50%)",
              color: "#ff765f",
              fontSize: "25px",
              fontWeight: 900,
            }}
          >
            ×
          </div>

          <div
            style={{
              marginTop: "18px",
              color: "#ff765f",
              fontSize:
            mobileOrientation === "landscape"
              ? "6px"
              : "9px",
              fontWeight: 900,
              letterSpacing: ".2em",
            }}
          >
            ARES ACCESS PROTOCOL
          </div>

          <h1
            style={{
              margin:
                "8px 0 0",
              fontSize: "24px",
              fontWeight: 900,
            }}
          >
            ARES ACCESS LOCKED
          </h1>

          <p
            style={{
              margin:
                "12px auto 0",
              maxWidth:
                "330px",
              color:
                "rgba(255,255,255,.62)",
              fontSize:
                "12px",
              lineHeight:
                1.65,
            }}
          >
            Complete Telegram Verification,
            X Verification and 7 completed
            Mining Days to enter Ares.
          </p>

          {!aresAccessError &&
            aresAccess && (
              <div
                style={{
                  display:
                    "grid",
                  gap: "7px",
                  marginTop:
                    "20px",
                  textAlign:
                    "left",
                }}
              >
                {[
                  [
                    "TELEGRAM VERIFICATION",
                    aresAccess.telegram_verified
                      ? "VERIFIED"
                      : "LOCKED",
                  ],
                  [
                    "X VERIFICATION",
                    aresAccess.x_verified
                      ? "VERIFIED"
                      : "LOCKED",
                  ],
                  [
                    "MINING DAYS",
                    `${aresAccess.mining_days} / ${aresAccess.required_mining_days}`,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "12px",
                        padding:
                          "9px 11px",
                        border:
                          "1px solid rgba(255,255,255,.07)",
                        borderRadius:
                          "8px",
                        background:
                          "rgba(255,255,255,.025)",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "rgba(255,255,255,.48)",
                          fontSize:
                            "8px",
                          fontWeight:
                            900,
                          letterSpacing:
                            ".08em",
                        }}
                      >
                        {label}
                      </span>

                      <strong
                        style={{
                          color:
                            value ===
                            "VERIFIED"
                              ? "#63f5ff"
                              : "#ff765f",
                          fontSize:
                            "8px",
                          letterSpacing:
                            ".06em",
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  ),
                )}
              </div>
            )}

          {aresAccessError && (
            <p
              style={{
                marginTop:
                  "16px",
                color:
                  "#ff765f",
                fontSize:
                  "11px",
              }}
            >
              {aresAccessError}
            </p>
          )}

          <a
            href="/mars"
            style={{
              display:
                "inline-flex",
              minHeight:
                "42px",
              marginTop:
                "22px",
              padding:
                "0 20px",
              alignItems:
                "center",
              justifyContent:
                "center",
              border:
                "1px solid rgba(99,245,255,.3)",
              borderRadius:
                "9px",
              background:
                "rgba(99,245,255,.07)",
              color:
                "#63f5ff",
              fontSize:
                "9px",
              fontWeight:
                900,
              letterSpacing:
                ".12em",
              textDecoration:
                "none",
            }}
          >
            RETURN TO MARS
          </a>
        </div>
      </div>
    );
  }

  if (mobileOrientation === "portrait") {
    return (
      <div
        className="mars-explore-rotate-gate"
        role="status"
        aria-live="polite"
      >
        <div className="mars-explore-rotate-gate__device" aria-hidden="true">
          <span />
        </div>

        <span className="mars-explore-rotate-gate__eyebrow">
          ARES EXPLORATION
        </span>

        <h1>{t("mars.ares.rotateTitle")}</h1>

        <p>
          Ares Exploration is designed for landscape mode.
        </p>

        <a href="/mars">
          RETURN TO MARS
        </a>
      </div>
    );
  }

  return (
    <div className="mars-explore-world">
      <MarsLanguageSelector
        style={
          mobileOrientation === "landscape"
            ? {
                top: "6px",
                fontSize: "6px",
                padding: "2px 5px",
              }
            : undefined
        }
      />

      <style>{`
        .mars-explore-world {
          position: relative;
          width: 100%;
          height: 100dvh;
          min-height: 100vh;
          background: #050712;
          overflow: hidden;
        }

        .mars-explore-rotate-gate {
          display: grid;
          width: 100%;
          height: 100dvh;
          min-height: 100vh;
          padding: 28px;
          place-content: center;
          justify-items: center;
          background:
            radial-gradient(circle at 50% 40%, rgba(126, 76, 255, 0.2), transparent 34%),
            radial-gradient(circle at 50% 55%, #281015 0%, #080811 52%, #030409 100%);
          color: #ffffff;
          text-align: center;
          font-family: Inter, system-ui, sans-serif;
          overflow: hidden;
        }

        .mars-explore-rotate-gate__device {
          position: relative;
          width: 88px;
          height: 52px;
          margin-bottom: 24px;
          border: 2px solid rgba(99, 245, 255, 0.78);
          border-radius: 13px;
          box-shadow:
            0 0 26px rgba(99, 245, 255, 0.16),
            inset 0 0 18px rgba(99, 245, 255, 0.05);
        }

        .mars-explore-rotate-gate__device span {
          position: absolute;
          top: 50%;
          right: 6px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #63f5ff;
          transform: translateY(-50%);
        }

        .mars-explore-rotate-gate__eyebrow {
          color: #63f5ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.22em;
        }

        .mars-explore-rotate-gate h1 {
          margin: 10px 0 0;
          font-size: clamp(26px, 8vw, 42px);
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .mars-explore-rotate-gate p {
          max-width: 390px;
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.58);
          font-size: 13px;
          line-height: 1.6;
        }

        .mars-explore-rotate-gate a {
          margin-top: 24px;
          padding: 11px 17px;
          border: 1px solid rgba(99, 245, 255, 0.25);
          border-radius: 999px;
          background: rgba(99, 245, 255, 0.07);
          color: #63f5ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-decoration: none;
        }

        .ares-mobile-joystick {
          display: none;
        }

        @media (pointer: coarse) and (orientation: landscape) {
          .ares-mobile-joystick {
            position: absolute;
            z-index: 40;
            bottom: max(18px, env(safe-area-inset-bottom));
            left: max(22px, calc(env(safe-area-inset-left) + 12px));
            display: block;
            width: 116px;
            height: 116px;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            overscroll-behavior: none;
          }

          .ares-mobile-joystick__base {
            position: relative;
            width: 116px;
            height: 116px;
            border: 1px solid rgba(99, 245, 255, 0.3);
            border-radius: 50%;
            background:
              radial-gradient(
                circle at 50% 50%,
                rgba(99, 245, 255, 0.11),
                rgba(5, 7, 18, 0.48) 58%,
                rgba(5, 7, 18, 0.22) 100%
              );
            box-shadow:
              0 0 30px rgba(99, 245, 255, 0.08),
              inset 0 0 24px rgba(99, 245, 255, 0.05);
            backdrop-filter: blur(8px);
            touch-action: none;
          }

          .ares-mobile-joystick__ring {
            position: absolute;
            inset: 20px;
            border: 1px solid rgba(99, 245, 255, 0.14);
            border-radius: 50%;
            pointer-events: none;
          }

          .ares-mobile-joystick__knob {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 46px;
            height: 46px;
            margin-top: -23px;
            margin-left: -23px;
            border: 1px solid rgba(99, 245, 255, 0.72);
            border-radius: 50%;
            background:
              radial-gradient(
                circle at 38% 32%,
                rgba(255, 255, 255, 0.28),
                rgba(99, 245, 255, 0.18) 32%,
                rgba(15, 30, 45, 0.88) 100%
              );
            box-shadow:
              0 0 20px rgba(99, 245, 255, 0.24),
              inset 0 0 12px rgba(99, 245, 255, 0.12);
            pointer-events: none;
            will-change: transform;
          }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .mars-explore-world {
            height: 100dvh;
            min-height: 0;
            overscroll-behavior: none;
          }

          .mars-explore-return-button {
            top: 10px !important;
            left: 10px !important;
          }
        }
      `}</style>

      <AresMobileJoystick
        onMove={handleJoystickMove}
      />

      <a
        className="mars-explore-return-button"
        href="/mars"
        aria-label="Return to Mars orbit"
      >
        <span aria-hidden="true">←</span>
        <span>
          {mobileOrientation === "landscape"
            ? "ORBIT"
            : "RETURN TO ORBIT"}
        </span>
      </a>

      <div
        style={{
          position: "absolute",
          top: mobileOrientation === "landscape" ? "8px" : "18px",
          right: mobileOrientation === "landscape" ? "8px" : "18px",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: mobileOrientation === "landscape" ? "4px" : "8px",
          padding:
            mobileOrientation === "landscape"
              ? "4px 7px"
              : "8px 12px",
          border:
            mobileOrientation === "landscape"
              ? "0"
              : "1px solid rgba(99,245,255,0.24)",
          borderRadius: "999px",
          background:
            mobileOrientation === "landscape"
              ? "rgba(5,7,18,0.28)"
              : "rgba(5,7,18,0.68)",
          color: "#ffffff",
          fontSize:
            mobileOrientation === "landscape"
              ? "7px"
              : "10px",
          fontWeight: 900,
          letterSpacing:
            mobileOrientation === "landscape"
              ? "0.08em"
              : "0.12em",
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
        {t("mars.ares.online", { count: onlineCount })}
      </div>

      {totalGp !== null && (
        <div
          style={{
            position: "absolute",
            top: mobileOrientation === "landscape" ? "8px" : "18px",
            right:
              mobileOrientation === "landscape"
                ? "92px"
                : "164px",
            zIndex: 20,
            padding:
              mobileOrientation === "landscape"
                ? "4px 7px"
                : "8px 12px",
            border:
              mobileOrientation === "landscape"
                ? "0"
                : "1px solid rgba(187,126,255,0.28)",
            borderRadius: "999px",
            background:
              mobileOrientation === "landscape"
                ? "rgba(5,7,18,0.28)"
                : "rgba(5,7,18,0.68)",
            color: "#d9b7ff",
            fontSize:
              mobileOrientation === "landscape"
                ? "7px"
                : "10px",
            fontWeight: 900,
            letterSpacing:
              mobileOrientation === "landscape"
                ? "0.06em"
                : "0.10em",
            pointerEvents: "none",
            backdropFilter: "blur(10px)",
          }}
        >
          {totalGp.toLocaleString(language)} GP
        </div>
      )}

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
          top:
            mobileOrientation === "landscape"
              ? "6px"
              : "18px",
          right:
            mobileOrientation === "landscape"
              ? "178px"
              : "150px",
          zIndex: 100,
          width:
            mobileOrientation === "landscape"
              ? "24px"
              : "34px",
          height:
            mobileOrientation === "landscape"
              ? "24px"
              : "34px",
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
          fontSize:
            mobileOrientation === "landscape"
              ? "11px"
              : "15px",
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
            top:
              mobileOrientation === "landscape"
                ? "34px"
                : "24px",
            left:
              mobileOrientation === "landscape"
                ? "auto"
                : "50%",
            right:
              mobileOrientation === "landscape"
                ? "8px"
                : "auto",
            transform:
              mobileOrientation === "landscape"
                ? "none"
                : "translateX(-50%)",
            zIndex: 90,
            width:
              mobileOrientation === "landscape"
                ? "132px"
                : "min(520px, calc(100vw - 48px))",
            padding:
              mobileOrientation === "landscape"
                ? "6px 7px"
                : "14px 17px",
            border:
              "1px solid rgba(99,245,255,.26)",
            borderRadius:
              mobileOrientation === "landscape"
                ? "7px"
                : "14px",
            background:
              mobileOrientation === "landscape"
                ? "rgba(5,10,20,.46)"
                : "rgba(5,10,20,.88)",
            boxShadow:
              mobileOrientation === "landscape"
                ? "none"
                : "0 14px 50px rgba(0,0,0,.3)",
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
              fontSize:
                mobileOrientation === "landscape"
                  ? "5px"
                  : "9px",
              fontWeight: 900,
              letterSpacing:
                mobileOrientation === "landscape"
                  ? ".11em"
                  : ".21em",
              color: "#63f5ff",
            }}
          >
            {t("mars.ares.protocol")}
          </div>

          <div
            style={{
              marginTop:
                mobileOrientation === "landscape"
                  ? "2px"
                  : "5px",
              fontSize:
                mobileOrientation === "landscape"
                  ? "7px"
                  : "17px",
              fontWeight: 900,
            }}
          >
            {t("mars.ares.followObjective")}
          </div>

          <div
            style={{
              display:
                mobileOrientation === "landscape"
                  ? "none"
                  : "flex",
              flexWrap: "wrap",
              gap: "7px",
              marginTop: "11px",
            }}
          >
            {[
              t("mars.ares.move"),
              t("mars.ares.run"),
              t("mars.ares.jump"),
              t("mars.ares.camera"),
              t("mars.ares.interact"),
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

      {hiddenMissionNavigation &&
        !archiveOpen && (
        <div
          data-ares-objective-navigator="active"
          aria-label="Ares Objective Navigator"
          style={{
            position: "fixed",
            left:
              mobileOrientation === "landscape"
                ? "8px"
                : "50%",
            bottom:
              mobileOrientation === "landscape"
                ? "8px"
                : "26px",
            transform:
              mobileOrientation === "landscape"
                ? "none"
                : "translateX(-50%)",
            zIndex:
              2147483647,
            display: "flex",
            alignItems:
              "center",
            gap:
              mobileOrientation === "landscape"
                ? "6px"
                : "14px",
            minWidth:
              mobileOrientation === "landscape"
                ? "0"
                : "310px",
            maxWidth:
              mobileOrientation === "landscape"
                ? "58vw"
                : undefined,
            padding:
              mobileOrientation === "landscape"
                ? "5px 8px"
                : "11px 15px",
            border:
              hiddenMissionNavigation.kind ===
              "mission"
                ? "1px solid rgba(196,126,255,.58)"
                : "1px solid rgba(99,245,255,.42)",
            borderRadius:
              mobileOrientation === "landscape"
                ? "8px"
                : "14px",
            background:
              mobileOrientation === "landscape"
                ? "rgba(4,7,15,.42)"
                : "rgba(4,7,15,.9)",
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
              width:
                mobileOrientation === "landscape"
                  ? "22px"
                  : "42px",
              height:
                mobileOrientation === "landscape"
                  ? "22px"
                  : "42px",
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
                fontSize:
                  mobileOrientation === "landscape"
                    ? "11px"
                    : "21px",
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
                fontSize:
                  mobileOrientation === "landscape"
                    ? "5px"
                    : "8px",
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
              {showLandmarkNavigation
                ? landmarkNavigation!.identified
                  ? "TERRAIN LANDMARK"
                  : "TERRAIN SIGNAL"
                : hiddenMissionNavigation.kind ===
                    "mission"
                  ? "HIDDEN ARES SIGNAL"
                  : hiddenMissionNavigation.kind ===
                      "terminal"
                    ? "MISSION TERMINAL"
                    : hiddenMissionNavigation.kind ===
                        "explore"
                      ? "ARES EXPLORATION"
                      : t("mars.ares.primaryObjective")}
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
                  fontSize:
                    mobileOrientation === "landscape"
                      ? "8px"
                      : "15px",
                }}
              >
                {showLandmarkNavigation
                  ? landmarkNavigation!.surveyNear
                    ? "SURVEY TERRAIN"
                    : landmarkNavigation!.identified
                      ? landmarkNavigation!.landmarkTitle
                      : "FOLLOW TERRAIN SIGNAL"
                  : hiddenMissionNavigation.kind ===
                      "mission"
                    ? hiddenMissionNavigation.near
                      ? t("mars.ares.scanSignal")
                      : "FOLLOW SIGNAL"
                    : hiddenMissionNavigation.kind ===
                        "terminal"
                      ? hiddenMissionNavigation.near
                        ? t("mars.ares.accessTerminal")
                        : "FIND MISSION TERMINAL"
                      : hiddenMissionNavigation.kind ===
                          "explore"
                        ? "EXPLORE ARES"
                        : hiddenMissionNavigation.near
                          ? t("mars.ares.enterCommandHub")
                          : t("mars.ares.reachCommandHub")}
              </strong>

              {(showLandmarkNavigation ||
                hiddenMissionNavigation.kind !==
                  "explore") && (
                <span
                  style={{
                    fontSize:
                      mobileOrientation === "landscape"
                        ? "7px"
                        : "11px",
                    fontWeight: 900,
                    color:
                      "rgba(255,255,255,.7)",
                  }}
                >
                  {Math.round(
                    showLandmarkNavigation
                      ? landmarkNavigation!.distance
                      : hiddenMissionNavigation.distance,
                  )} M
                </span>
              )}
            </div>

            <div
              style={{
                marginTop:
                  mobileOrientation === "landscape"
                    ? "1px"
                    : "3px",
                fontSize:
                  mobileOrientation === "landscape"
                    ? "5px"
                    : "8px",
                fontWeight: 800,
                letterSpacing:
                  ".1em",
                color:
                  "rgba(255,255,255,.5)",
              }}
            >
              {showLandmarkNavigation
                ? landmarkNavigation!.surveyNear
                  ? "HOLD E TO SURVEY"
                  : Math.abs(
                        landmarkNavigation!.relativeAngle,
                      ) < 14
                    ? "AHEAD"
                    : landmarkNavigation!.relativeAngle >
                        0
                      ? "TURN RIGHT"
                      : "TURN LEFT"
                : hiddenMissionNavigation.kind ===
                    "explore"
                  ? "SEARCH FOR SIGNALS AND ANOMALIES"
                  : hiddenMissionNavigation.kind ===
                    "mission" &&
                  hiddenMissionNavigation.near
                  ? t("mars.ares.holdScan")
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

      <button
        type="button"
        onClick={() => {
          if (placementItem) {
            cancelPlacement();
          }

          setPlacementError(null);
          setMarketOpen(true);
          setOnboardingVisible(false);
        }}
        aria-label={t("mars.market.open")}
        style={{
          position: "fixed",
          top:
            mobileOrientation === "landscape"
              ? "auto"
              : "62px",
          right:
            mobileOrientation === "landscape"
              ? "8px"
              : "18px",
          bottom:
            mobileOrientation === "landscape"
              ? "8px"
              : "auto",
          zIndex: 100,
          minHeight:
            mobileOrientation === "landscape"
              ? "24px"
              : "34px",
          padding:
            mobileOrientation === "landscape"
              ? "0 8px"
              : "0 13px",
          border:
            "1px solid rgba(197,109,255,.34)",
          borderRadius: "999px",
          background:
            "rgba(5,7,18,.78)",
          color: "#d9b7ff",
          cursor: "pointer",
          backdropFilter:
            "blur(12px)",
          fontSize: "9px",
          fontWeight: 900,
          letterSpacing: ".1em",
        }}
      >
        {t("mars.market.title")}
      </button>

      {placementError && (
        <div
          style={{
            position: "fixed",
            top: "104px",
            right: "18px",
            zIndex: 110,
            maxWidth: "320px",
            padding: "9px 12px",
            border:
              "1px solid rgba(255,118,95,.34)",
            borderRadius: "10px",
            background:
              "rgba(5,7,18,.9)",
            color: "#ff765f",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: ".08em",
          }}
        >
          {placementError}
        </div>
      )}

      <MarsMarket
        open={marketOpen}
        onClose={() => {
          setMarketOpen(false);
        }}
        onPurchaseComplete={async () => {
          await refreshGp();
        }}
        onPlaceInventoryBuilding={
          beginInventoryPlacement
        }
      />

      {archiveOpen &&
        archiveRecord && (
          <AresDiscoveryRecordPanel
            record={archiveRecord}
            onClose={() => {
              setArchiveOpen(false);
              setArchiveRecord(null);
            }}
          />
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
        analogMovementRef={
          analogMovementRef
        }
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
              onLandmarkNavigationChange={
                handleLandmarkNavigationChange
              }
              onLandmarkDiscovered={refreshGp}
              onMissionCompleted={refreshGp}
              onMissionStateChange={
                setExplorationMission
              }
              onArchiveOpenChange={
                setArchiveOpen
              }
              onArchiveRecordChange={
                setArchiveRecord
              }
              placementItem={
                placementItem
              }
              placementDefinition={
                placementDefinition
              }
              placementColonyId={
                placementColonyId
              }
              onPlacementCancel={
                cancelPlacement
              }
              onPlacementSaved={
                handlePlacementSaved
              }
              colonyBuildingsRefreshKey={
                colonyBuildingsRefreshKey
              }
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

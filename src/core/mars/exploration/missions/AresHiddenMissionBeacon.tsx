import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Html,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import { useLanguage } from "../../../language";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
} from "../engine/AresGenesisTerrainData";

import {
  completeMyAresHiddenMission,
  startMyAresHiddenMissionScan,
  type AresHiddenMission,
} from "./AresHiddenMissionService";

type Props = {
  mission:
    AresHiddenMission;

  targetRef:
    React.RefObject<THREE.Group | null>;

  onCompleted:
    (
      rewardGp:
        number,
    ) => void;

  onNavigation:
    (
      navigation:
        {
          distance:
            number;
          bearing:
            number;
          near:
            boolean;
        } | null,
    ) => void;
};

const LOCAL_SCAN_DURATION_SECONDS =
  3.15;

export function AresHiddenMissionBeacon({
  mission,
  targetRef,
  onCompleted,
  onNavigation,
}: Props) {
  const { t } = useLanguage();
  const [
    terrainHeight,
    setTerrainHeight,
  ] = useState(0);

  const [
    isNear,
    setIsNear,
  ] = useState(false);

  const [
    scanProgress,
    setScanProgress,
  ] = useState(0);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    completionReward,
    setCompletionReward,
  ] =
    useState<number | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const ringRef =
    useRef<THREE.Group | null>(
      null,
    );

  const beamRef =
    useRef<THREE.MeshBasicMaterial | null>(
      null,
    );

  const nearRef =
    useRef(false);

  const scanHeldRef =
    useRef(false);

  const scanStartedRef =
    useRef(false);

  const scanElapsedRef =
    useRef(0);

  const completingRef =
    useRef(false);

  const navigationRef =
    useRef<{
      distance:
        number;
      bearing:
        number;
      near:
        boolean;
    } | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    loadAresGenesisTerrainData()
      .then(
        (
          terrain,
        ) => {
          if (!active) {
            return;
          }

          setTerrainHeight(
            sampleAresGenesisGameplaySurfaceMeters(
              terrain,
              mission.targetX,
              mission.targetZ,
            ),
          );
        },
      )
      .catch(
        (
          terrainError,
        ) => {
          console.error(
            "Failed to place hidden mission beacon",
            terrainError,
          );
        },
      );

    return () => {
      active = false;

      onNavigation(
        null,
      );
    };
  }, [
    mission.targetX,
    mission.targetZ,
    onNavigation,
  ]);

  useEffect(() => {
    async function beginScan() {
      if (
        scanStartedRef.current ||
        isSubmitting ||
        completionReward !==
          null
      ) {
        return;
      }

      try {
        setError(null);

        await startMyAresHiddenMissionScan(
          mission.missionKey,
        );

        scanStartedRef.current =
          true;
      } catch (
        scanError
      ) {
        scanHeldRef.current =
          false;

        console.error(
          "Failed to start Ares hidden mission scan",
          scanError,
        );

        setError(
          "SCAN LINK FAILED",
        );
      }
    }

    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.code !==
          "KeyE" ||
        event.repeat ||
        !nearRef.current ||
        completionReward !==
          null
      ) {
        return;
      }

      event.preventDefault();

      scanHeldRef.current =
        true;

      void beginScan();
    }

    function handleKeyUp(
      event:
        KeyboardEvent,
    ) {
      if (
        event.code !==
        "KeyE"
      ) {
        return;
      }

      scanHeldRef.current =
        false;

      if (
        !completingRef.current
      ) {
        scanElapsedRef.current =
          0;

        setScanProgress(
          0,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "keyup",
      handleKeyUp,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp,
      );
    };
  }, [
    completionReward,
    isSubmitting,
    mission.missionKey,
  ]);

  useFrame(
    (
      {
        clock,
      },
      delta,
    ) => {
      const t =
        clock.elapsedTime;

      if (
        ringRef.current
      ) {
        ringRef.current.rotation.y +=
          delta * 0.8;

        ringRef.current.position.y =
          1.5 +
          Math.sin(
            t * 2,
          ) *
            0.12;
      }

      if (
        beamRef.current
      ) {
        beamRef.current.opacity =
          0.18 +
          (
            Math.sin(
              t * 2.4,
            ) +
            1
          ) *
            0.07;
      }

      const target =
        targetRef.current;

      if (target) {
        const dx =
          target.position.x -
          mission.targetX;

        const dz =
          target.position.z -
          mission.targetZ;

        const distance =
          Math.sqrt(
            dx * dx +
              dz * dz,
          );

        const near =
          distance <=
          mission.targetRadius;

        const bearing =
          THREE.MathUtils.radToDeg(
            Math.atan2(
              mission.targetX -
                target.position.x,
              mission.targetZ -
                target.position.z,
            ),
          );

        const previousNavigation =
          navigationRef.current;

        const roundedDistance =
          Math.round(
            distance,
          );

        const roundedBearing =
          Math.round(
            (
              bearing +
              360
            ) %
              360,
          );

        if (
          !previousNavigation ||
          Math.round(
            previousNavigation.distance,
          ) !==
            roundedDistance ||
          Math.round(
            (
              previousNavigation.bearing +
              360
            ) %
              360,
          ) !==
            roundedBearing ||
          previousNavigation.near !==
            near
        ) {
          const navigation = {
            distance,
            bearing,
            near,
          };

          navigationRef.current =
            navigation;

          onNavigation(
            navigation,
          );
        }

        if (
          near !==
          nearRef.current
        ) {
          nearRef.current =
            near;

          setIsNear(
            near,
          );

          if (!near) {
            scanHeldRef.current =
              false;

            scanElapsedRef.current =
              0;

            setScanProgress(
              0,
            );
          }
        }
      }

      if (
        !nearRef.current ||
        !scanHeldRef.current ||
        !scanStartedRef.current ||
        completingRef.current ||
        completionReward !==
          null
      ) {
        return;
      }

      scanElapsedRef.current +=
        delta;

      const progress =
        THREE.MathUtils.clamp(
          scanElapsedRef.current /
            LOCAL_SCAN_DURATION_SECONDS,
          0,
          1,
        );

      setScanProgress(
        Math.round(
          progress *
            100,
        ),
      );

      if (
        progress < 1
      ) {
        return;
      }

      scanHeldRef.current =
        false;

      completingRef.current =
        true;

      setIsSubmitting(
        true,
      );

      void completeMyAresHiddenMission(
        mission.missionKey,
      )
        .then(
          (
            result,
          ) => {
            setCompletionReward(
              result.rewardGp,
            );

            setScanProgress(
              100,
            );

            window.setTimeout(
              () => {
                onCompleted(
                  result.rewardGp,
                );
              },
              2200,
            );
          },
        )
        .catch(
          (
            completionError,
          ) => {
            console.error(
              "Failed to complete Ares hidden mission",
              completionError,
            );

            scanStartedRef.current =
              false;

            scanElapsedRef.current =
              0;

            setScanProgress(
              0,
            );

            setError(
              "MISSION SYNC FAILED · HOLD E TO RETRY",
            );
          },
        )
        .finally(
          () => {
            completingRef.current =
              false;

            setIsSubmitting(
              false,
            );
          },
        );
    },
  );

  return (
    <>
      <group
        position={[
          mission.targetX,
          terrainHeight +
            0.08,
          mission.targetZ,
        ]}
      >
      <mesh
        position={[
          0,
          0.03,
          0,
        ]}
        rotation={[
          -Math.PI /
            2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            1.6,
            1.9,
            48,
          ]}
        />

        <meshStandardMaterial
          color="#9653d8"
          emissive="#64289d"
          emissiveIntensity={1.4}
          transparent
          opacity={0.8}
        />
      </mesh>

      <group
        ref={
          ringRef
        }
        position={[
          0,
          1.5,
          0,
        ]}
      >
        <mesh
          rotation={[
            Math.PI /
              2,
            0,
            0,
          ]}
        >
          <torusGeometry
            args={[
              0.62,
              0.045,
              10,
              40,
            ]}
          />

          <meshStandardMaterial
            color="#c48aff"
            emissive="#8e42d2"
            emissiveIntensity={2}
          />
        </mesh>

        <mesh>
          <octahedronGeometry
            args={[
              0.25,
              0,
            ]}
          />

          <meshStandardMaterial
            color="#e0c1ff"
            emissive="#a34fe8"
            emissiveIntensity={2.6}
          />
        </mesh>
      </group>

      <mesh
        position={[
          0,
          5,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.04,
            0.35,
            10,
            12,
            1,
            true,
          ]}
        />

        <meshBasicMaterial
          ref={
            beamRef
          }
          color="#a95de8"
          transparent
          opacity={0.22}
          depthWrite={false}
          side={
            THREE.DoubleSide
          }
        />
      </mesh>

      <Html
        center
        position={[
          0,
          2.8,
          0,
        ]}
        distanceFactor={8}
        style={{
          pointerEvents:
            "none",
          width:
            "250px",
          padding:
            "10px 12px",
          border:
            "1px solid rgba(180,110,235,.42)",
          borderRadius:
            "12px",
          background:
            "rgba(7,6,14,.88)",
          color:
            "#fff",
          fontFamily:
            "Inter, system-ui, sans-serif",
          textAlign:
            "center",
        }}
      >
        <div
          style={{
            fontSize:
              "9px",
            fontWeight:
              900,
            letterSpacing:
              ".16em",
            color:
              "#c99cf3",
          }}
        >
          {t("mars.mission.signal")}
        </div>

        {!isNear &&
          completionReward ===
            null && (
            <div
              style={{
                marginTop:
                  "5px",
                fontSize:
                  "10px",
                color:
                  "#d7d0dd",
              }}
            >
              {t("mars.mission.approachSignal")}
            </div>
          )}

        {isNear &&
          completionReward ===
            null && (
            <>
              <div
                style={{
                  marginTop:
                    "6px",
                  fontSize:
                    "11px",
                  fontWeight:
                    900,
                }}
              >
                {isSubmitting
                  ? t("mars.mission.syncing")
                  : scanProgress >
                      0
                    ? t("mars.mission.scanning", { progress: scanProgress })
                    : t("mars.mission.holdScan")}
              </div>

              <div
                style={{
                  marginTop:
                    "8px",
                  height:
                    "4px",
                  overflow:
                    "hidden",
                  borderRadius:
                    "999px",
                  background:
                    "rgba(255,255,255,.12)",
                }}
              >
                <div
                  style={{
                    height:
                      "100%",
                    width:
                      `${scanProgress}%`,
                    background:
                      "#a95de8",
                    transition:
                      "width .08s linear",
                  }}
                />
              </div>
            </>
          )}

        {completionReward !==
          null && (
          <div
            style={{
              marginTop:
                "6px",
              fontSize:
                "11px",
              fontWeight:
                900,
              color:
                "#d8b5ff",
            }}
          >
            {t("mars.mission.complete", {
              reward: completionReward,
            })}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop:
                "7px",
              fontSize:
                "9px",
              fontWeight:
                900,
              color:
                "#ff8f8f",
            }}
          >
            {error}
          </div>
        )}
      </Html>
      </group>
    </>
  );
}
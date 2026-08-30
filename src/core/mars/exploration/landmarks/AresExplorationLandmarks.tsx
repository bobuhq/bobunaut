import {
  Html,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import {
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import {
  completeMyAresLandmarkSurvey,
  getMyAresLandmarkDiscoveries,
  startMyAresLandmarkSurvey,
  type AresLandmarkDiscovery,
} from "./AresLandmarkDiscoveryService";

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

type LandmarkKind =
  | "RIDGE"
  | "DEPRESSION"
  | "ESCARPMENT";

export type AresLandmarkNavigation = {
  landmarkKey: string;
  landmarkTitle: string;
  distance: number;
  relativeAngle: number;
  identified: boolean;
  surveyNear: boolean;
};

type AresLandmark = {
  id: string;
  kind: LandmarkKind;
  title: string;
  x: number;
  z: number;
  description: string;
};

const LANDMARKS: AresLandmark[] = [
  {
    id: "ares-ridge-01",
    kind: "RIDGE",
    title: "Ares Ridge",
    x: -125.5,
    z: -276.1,
    description:
      "Local terrain prominence identified from the Ares Genesis elevation field.",
  },
  {
    id: "ares-depression-01",
    kind: "DEPRESSION",
    title: "Ares Basin",
    x: 527.1,
    z: -225.9,
    description:
      "Local terrain depression identified from the Ares Genesis elevation field.",
  },
  {
    id: "ares-escarpment-01",
    kind: "ESCARPMENT",
    title: "Ares Escarpment",
    x: 225.9,
    z: -426.7,
    description:
      "Steep terrain zone identified from the Ares Genesis elevation field.",
  },
];

const DETECTION_DISTANCE = 120;
const LABEL_DISTANCE = 55;
const SURVEY_DISTANCE = 4;
const SURVEY_DURATION_SECONDS = 3;

function LandmarkMarker({
  landmark,
  terrain,
  targetRef,
  discovery,
  onDiscoveryChanged,
}: {
  landmark: AresLandmark;
  terrain: AresGenesisTerrainData;
  targetRef: MutableRefObject<THREE.Group | null>;
  discovery: AresLandmarkDiscovery | null;
  onDiscoveryChanged: (
    discovery: AresLandmarkDiscovery,
  ) => void;
}) {
  const groupRef =
    useRef<THREE.Group | null>(
      null,
    );

  const [
    nearby,
    setNearby,
  ] =
    useState(false);

  const [
    close,
    setClose,
  ] =
    useState(false);

  const [
    surveyNear,
    setSurveyNear,
  ] =
    useState(false);

  const [
    surveyProgress,
    setSurveyProgress,
  ] =
    useState(0);

  const [
    surveyError,
    setSurveyError,
  ] =
    useState<string | null>(
      null,
    );

  const surveyNearRef =
    useRef(false);

  const surveyHeldRef =
    useRef(false);

  const surveyStartedRef =
    useRef(
      discovery?.status ===
        "surveying",
    );

  const surveyElapsedRef =
    useRef(0);

  const completingRef =
    useRef(false);

  const isDiscovered =
    discovery?.status ===
    "discovered";

  useEffect(() => {
    surveyStartedRef.current =
      discovery?.status ===
      "surveying";

    if (isDiscovered) {
      surveyHeldRef.current =
        false;

      surveyElapsedRef.current =
        0;

      setSurveyProgress(
        100,
      );
    }
  }, [
    discovery?.status,
    isDiscovered,
  ]);

  useEffect(() => {
    async function beginSurvey() {
      if (
        surveyStartedRef.current ||
        completingRef.current ||
        isDiscovered
      ) {
        return;
      }

      try {
        setSurveyError(
          null,
        );

        const result =
          await startMyAresLandmarkSurvey(
            landmark.id,
          );

        surveyStartedRef.current =
          result.status ===
          "surveying";

        onDiscoveryChanged(
          result,
        );
      } catch (error) {
        surveyHeldRef.current =
          false;

        console.error(
          "Failed to start Ares landmark survey",
          error,
        );

        setSurveyError(
          "SURVEY LINK FAILED",
        );
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.code !==
          "KeyE" ||
        event.repeat ||
        !surveyNearRef.current ||
        isDiscovered
      ) {
        return;
      }

      event.preventDefault();

      surveyHeldRef.current =
        true;

      void beginSurvey();
    }

    function handleKeyUp(
      event: KeyboardEvent,
    ) {
      if (
        event.code !==
        "KeyE"
      ) {
        return;
      }

      surveyHeldRef.current =
        false;

      if (
        !completingRef.current &&
        !isDiscovered
      ) {
        surveyElapsedRef.current =
          0;

        setSurveyProgress(
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
    landmark.id,
    isDiscovered,
    onDiscoveryChanged,
  ]);

  const terrainY =
    useMemo(
      () =>
        sampleAresGenesisGameplaySurfaceMeters(
          terrain,
          landmark.x,
          landmark.z,
        ),
      [
        terrain,
        landmark.x,
        landmark.z,
      ],
    );

  useFrame((_, delta) => {
    const player =
      targetRef.current;

    if (!player) {
      return;
    }

    const dx =
      player.position.x -
      landmark.x;

    const dz =
      player.position.z -
      landmark.z;

    const distance =
      Math.sqrt(
        dx * dx +
        dz * dz,
      );

    const nextNearby =
      distance <=
      DETECTION_DISTANCE;

    const nextClose =
      distance <=
      LABEL_DISTANCE;

    const nextSurveyNear =
      distance <=
      SURVEY_DISTANCE;

    if (
      nextSurveyNear !==
      surveyNearRef.current
    ) {
      surveyNearRef.current =
        nextSurveyNear;

      setSurveyNear(
        nextSurveyNear,
      );

      if (
        !nextSurveyNear &&
        !isDiscovered
      ) {
        surveyHeldRef.current =
          false;

        surveyElapsedRef.current =
          0;

        setSurveyProgress(
          0,
        );
      }
    }

    setNearby(
      (current) =>
        current ===
        nextNearby
          ? current
          : nextNearby,
    );

    setClose(
      (current) =>
        current ===
        nextClose
          ? current
          : nextClose,
    );

    const group =
      groupRef.current;

    if (group) {
      group.visible =
        nextNearby;

      group.rotation.y +=
        0.0025;
    }

    if (
      !surveyNearRef.current ||
      !surveyHeldRef.current ||
      !surveyStartedRef.current ||
      completingRef.current ||
      isDiscovered
    ) {
      return;
    }

    surveyElapsedRef.current +=
      delta;

    const progress =
      THREE.MathUtils.clamp(
        surveyElapsedRef.current /
          SURVEY_DURATION_SECONDS,
        0,
        1,
      );

    setSurveyProgress(
      Math.round(
        progress *
          100,
      ),
    );

    if (progress < 1) {
      return;
    }

    surveyHeldRef.current =
      false;

    completingRef.current =
      true;

    void completeMyAresLandmarkSurvey(
      landmark.id,
    )
      .then(
        (result) => {
          setSurveyProgress(
            100,
          );

          setSurveyError(
            null,
          );

          onDiscoveryChanged(
            result,
          );
        },
      )
      .catch(
        (error) => {
          console.error(
            "Failed to complete Ares landmark survey",
            error,
          );

          surveyStartedRef.current =
            false;

          surveyElapsedRef.current =
            0;

          setSurveyProgress(
            0,
          );

          setSurveyError(
            "SURVEY SYNC FAILED · HOLD E TO RETRY",
          );
        },
      )
      .finally(
        () => {
          completingRef.current =
            false;
        },
      );
  });

  return (
    <group
      ref={groupRef}
      position={[
        landmark.x,
        terrainY + 0.12,
        landmark.z,
      ]}
      visible={false}
    >
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            1.35,
            1.39,
            72,
          ]}
        />

        <meshBasicMaterial
          color="#9edcff"
          transparent
          opacity={0.20}
          depthWrite={false}
          side={
            THREE.DoubleSide
          }
        />
      </mesh>

      {close && (
        <Html
          position={[
            0,
            2.05,
            0,
          ]}
          center
          distanceFactor={12}
          style={{
            pointerEvents:
              "none",
          }}
        >
          <div
            style={{
              minWidth:
                "190px",
              padding:
                "10px 13px",
              border:
                "1px solid rgba(158,220,255,0.42)",
              borderRadius:
                "8px",
              background:
                "rgba(5,12,18,0.82)",
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.34)",
              backdropFilter:
                "blur(8px)",
              color:
                "#eaf8ff",
              fontFamily:
                "Inter, system-ui, sans-serif",
            }}
          >
            <div
              style={{
                marginBottom:
                  "4px",
                color:
                  "#8ed8ff",
                fontSize:
                  "9px",
                fontWeight:
                  800,
                letterSpacing:
                  "0.16em",
              }}
            >
              TERRAIN SURVEY
            </div>

            <div
              style={{
                fontSize:
                  "14px",
                fontWeight:
                  800,
              }}
            >
              {landmark.title}
            </div>

            <div
              style={{
                marginTop:
                  "3px",
                color:
                  "rgba(225,241,249,0.72)",
                fontSize:
                  "10px",
                letterSpacing:
                  "0.08em",
              }}
            >
              {landmark.kind}
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                maxWidth:
                  "205px",
                color:
                  "rgba(225,241,249,0.72)",
                fontSize:
                  "10px",
                lineHeight:
                  1.45,
              }}
            >
              {landmark.description}
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "rgba(225,241,249,0.48)",
                fontSize:
                  "8px",
                lineHeight:
                  1.35,
              }}
            >
              GAMEPLAY TERRAIN CLASSIFICATION
            </div>

            {surveyNear && (
              <div
                style={{
                  marginTop:
                    "9px",
                  paddingTop:
                    "8px",
                  borderTop:
                    "1px solid rgba(158,220,255,0.16)",
                  color:
                    isDiscovered
                      ? "#8fffc1"
                      : "#bdeaff",
                  fontSize:
                    "9px",
                  fontWeight:
                    800,
                  letterSpacing:
                    "0.08em",
                }}
              >
                {isDiscovered
                  ? "LANDMARK DISCOVERED · +100 GP"
                  : surveyProgress > 0
                    ? `SURVEYING ${surveyProgress}%`
                    : "HOLD E — SURVEY TERRAIN"}

                {!isDiscovered &&
                  surveyProgress > 0 && (
                    <div
                      style={{
                        height:
                          "2px",
                        marginTop:
                          "6px",
                        overflow:
                          "hidden",
                        borderRadius:
                          "2px",
                        background:
                          "rgba(158,220,255,0.14)",
                      }}
                    >
                      <div
                        style={{
                          width:
                            `${surveyProgress}%`,
                          height:
                            "100%",
                          background:
                            "#9edcff",
                        }}
                      />
                    </div>
                  )}

                {surveyError && (
                  <div
                    style={{
                      marginTop:
                        "6px",
                      color:
                        "#ff9d9d",
                      fontSize:
                        "8px",
                    }}
                  >
                    {surveyError}
                  </div>
                )}
              </div>
            )}

          </div>
        </Html>
      )}
    </group>
  );
}

export function AresExplorationLandmarks({
  targetRef,
  onNavigation,
}: {
  targetRef: MutableRefObject<THREE.Group | null>;
  onNavigation?: (
    navigation: AresLandmarkNavigation | null,
  ) => void;
}) {
  const [
    terrain,
    setTerrain,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

  const [
    discoveries,
    setDiscoveries,
  ] =
    useState<
      Record<
        string,
        AresLandmarkDiscovery
      >
    >({});

  useEffect(() => {
    let active =
      true;

    loadAresGenesisTerrainData()
      .then(
        (
          loadedTerrain,
        ) => {
          if (
            active
          ) {
            setTerrain(
              loadedTerrain,
            );
          }
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "Failed to initialize Ares exploration landmarks",
            error,
          );
        },
      );

    return () => {
      active =
        false;
    };
  }, []);

  useEffect(() => {
    let active =
      true;

    getMyAresLandmarkDiscoveries()
      .then(
        (records) => {
          if (!active) {
            return;
          }

          setDiscoveries(
            Object.fromEntries(
              records.map(
                (record) => [
                  record.landmarkKey,
                  record,
                ],
              ),
            ),
          );
        },
      )
      .catch(
        (error) => {
          console.error(
            "Failed to restore Ares landmark discoveries",
            error,
          );
        },
      );

    return () => {
      active =
        false;
    };
  }, []);

  function handleDiscoveryChanged(
    discovery: AresLandmarkDiscovery,
  ) {
    setDiscoveries(
      (current) => ({
        ...current,
        [discovery.landmarkKey]:
          discovery,
      }),
    );
  }

  useFrame(({ camera }) => {
    if (
      !onNavigation ||
      !targetRef.current
    ) {
      return;
    }

    const player =
      targetRef.current;

    const available =
      LANDMARKS
        .filter(
          (landmark) =>
            discoveries[
              landmark.id
            ]?.status !==
            "discovered",
        )
        .map(
          (landmark) => {
            const dx =
              landmark.x -
              player.position.x;

            const dz =
              landmark.z -
              player.position.z;

            return {
              landmark,
              dx,
              dz,
              distance:
                Math.sqrt(
                  dx * dx +
                  dz * dz,
                ),
            };
          },
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance,
        );

    const nearest =
      available[0];

    if (!nearest) {
      onNavigation(
        null,
      );

      return;
    }

    const cameraForward =
      new THREE.Vector3();

    camera.getWorldDirection(
      cameraForward,
    );

    cameraForward.y =
      0;

    if (
      cameraForward.lengthSq() <
      0.0001
    ) {
      cameraForward.set(
        0,
        0,
        -1,
      );
    } else {
      cameraForward.normalize();
    }

    const targetDirection =
      new THREE.Vector3(
        nearest.dx,
        0,
        nearest.dz,
      ).normalize();

    const cross =
      cameraForward.x *
        targetDirection.z -
      cameraForward.z *
        targetDirection.x;

    const dot =
      THREE.MathUtils.clamp(
        cameraForward.dot(
          targetDirection,
        ),
        -1,
        1,
      );

    const relativeAngle =
      THREE.MathUtils.radToDeg(
        Math.atan2(
          cross,
          dot,
        ),
      );

    onNavigation({
      landmarkKey:
        nearest.landmark.id,
      landmarkTitle:
        nearest.landmark.title,
      distance:
        nearest.distance,
      relativeAngle,
      identified:
        nearest.distance <=
        LABEL_DISTANCE,
      surveyNear:
        nearest.distance <=
        SURVEY_DISTANCE,
    });
  });

  if (!terrain) {
    return null;
  }

  return (
    <>
      {LANDMARKS.map(
        (
          landmark,
        ) => (
          <LandmarkMarker
            key={
              landmark.id
            }
            landmark={
              landmark
            }
            terrain={
              terrain
            }
            targetRef={
              targetRef
            }
            discovery={
              discoveries[
                landmark.id
              ] ?? null
            }
            onDiscoveryChanged={
              handleDiscoveryChanged
            }
          />
        ),
      )}
    </>
  );
}

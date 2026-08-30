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
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

type LandmarkKind =
  | "RIDGE"
  | "DEPRESSION"
  | "ESCARPMENT";

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

const DETECTION_DISTANCE = 85;
const LABEL_DISTANCE = 42;

function LandmarkMarker({
  landmark,
  terrain,
  targetRef,
}: {
  landmark: AresLandmark;
  terrain: AresGenesisTerrainData;
  targetRef: MutableRefObject<THREE.Group | null>;
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

  useFrame(() => {
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
          </div>
        </Html>
      )}
    </group>
  );
}

export function AresExplorationLandmarks({
  targetRef,
}: {
  targetRef: MutableRefObject<THREE.Group | null>;
}) {
  const [
    terrain,
    setTerrain,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

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
          />
        ),
      )}
    </>
  );
}

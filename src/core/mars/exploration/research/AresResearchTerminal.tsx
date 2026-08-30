import {
  Html,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import {
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import type {
  AresHiddenMission,
} from "../missions/AresHiddenMissionService";

import {
  useAresResearchTerminal,
} from "./useAresResearchTerminal";

type Props = {
  targetRef:
    React.RefObject<THREE.Group | null>;

  mission:
    AresHiddenMission | null;

  worldPosition: {
    x: number;
    z: number;
  };
};

const ACCESS_DISTANCE = 3.1;

export function AresResearchTerminal({
  targetRef,
  mission,
  worldPosition,
}: Props) {
  const screenRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  const coreRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  const nearRef =
    useRef(false);

  const [
    isNear,
    setIsNear,
  ] = useState(false);

  const {
    state: researchState,
    progress: researchProgress,
  } =
    useAresResearchTerminal(
      mission,
      isNear,
    );

  const researchReady =
    mission?.status ===
      "claimed";

  const researchCompleted =
    researchState ===
      "completed";

  const researchAnalyzing =
    researchState ===
      "analyzing";

  useFrame(({ clock }) => {
    const pulse =
      1 +
      Math.sin(
        clock.elapsedTime *
          1.8,
      ) *
        0.16;

    if (screenRef.current) {
      screenRef.current.emissiveIntensity =
        researchReady
          ? 1.7 * pulse
          : 0.5;
    }

    if (coreRef.current) {
      coreRef.current.emissiveIntensity =
        researchReady
          ? 2.2 * pulse
          : 0.55;
    }

    const target =
      targetRef.current;

    if (!target) {
      return;
    }

    const dx =
      target.position.x -
      worldPosition.x;

    const dz =
      target.position.z -
      worldPosition.z;

    const nextNear =
      dx * dx +
        dz * dz <=
      ACCESS_DISTANCE *
        ACCESS_DISTANCE;

    if (
      nextNear !==
      nearRef.current
    ) {
      nearRef.current =
        nextNear;

      setIsNear(
        nextNear,
      );
    }
  });

  return (
    <group
      position={[
        -2.65,
        0,
        1.55,
      ]}
      rotation={[
        0,
        0,
        0,
      ]}
    >
      <mesh
        position={[
          0,
          0.08,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            2.9,
            0.16,
            1.65,
          ]}
        />

        <meshStandardMaterial
          color="#171d21"
          metalness={0.78}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.76,
          -0.18,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            2.65,
            1.35,
            1.18,
          ]}
        />

        <meshStandardMaterial
          color="#11181d"
          metalness={0.82}
          roughness={0.24}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.63,
          -0.35,
        ]}
        rotation={[
          -0.16,
          0,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            2.42,
            0.82,
            0.22,
          ]}
        />

        <meshStandardMaterial
          color="#202a30"
          metalness={0.76}
          roughness={0.25}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.64,
          -0.22,
        ]}
        rotation={[
          -0.16,
          0,
          0,
        ]}
      >
        <planeGeometry
          args={[
            2.08,
            0.53,
          ]}
        />

        <meshStandardMaterial
          ref={screenRef}
          color={
            researchReady
              ? "#74f4ff"
              : "#29474d"
          }
          emissive={
            researchReady
              ? "#23d9ed"
              : "#163138"
          }
          emissiveIntensity={
            researchReady
              ? 1.7
              : 0.5
          }
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.08,
          0.53,
        ]}
        rotation={[
          -0.48,
          0,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            2.3,
            0.12,
            0.82,
          ]}
        />

        <meshStandardMaterial
          color="#252f35"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[
          -0.72,
          1.12,
          0.55,
        ]}
        rotation={[
          -0.48,
          0,
          0,
        ]}
      >
        <boxGeometry
          args={[
            0.34,
            0.07,
            0.24,
          ]}
        />

        <meshStandardMaterial
          color="#6cf3ff"
          emissive="#27d7ec"
          emissiveIntensity={
            researchReady
              ? 1.7
              : 0.45
          }
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.73,
          0.63,
        ]}
      >
        <cylinderGeometry
          args={[
            0.15,
            0.15,
            0.62,
            16,
          ]}
        />

        <meshStandardMaterial
          ref={coreRef}
          color={
            researchReady
              ? "#8cf8ff"
              : "#315158"
          }
          emissive={
            researchReady
              ? "#29dff1"
              : "#18343a"
          }
          emissiveIntensity={
            researchReady
              ? 2.2
              : 0.55
          }
          toneMapped={false}
        />
      </mesh>

      <pointLight
        position={[
          0,
          1.5,
          0.45,
        ]}
        color="#62efff"
        intensity={
          researchReady
            ? 2.8
            : 0.7
        }
        distance={5}
        decay={2}
      />

      <Html
        center
        position={[
          0,
          2.25,
          0,
        ]}
        distanceFactor={7}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          padding:
            "5px 9px",
          border:
            "1px solid rgba(91,239,255,.35)",
          borderRadius:
            "999px",
          background:
            "rgba(5,14,18,.84)",
          color:
            researchReady
              ? "#93f8ff"
              : "#709ba0",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize:
            "9px",
          fontWeight:
            900,
          letterSpacing:
            ".18em",
          boxShadow:
            researchReady
              ? "0 0 18px rgba(45,223,241,.18)"
              : "none",
        }}
      >
        RESEARCH TERMINAL
      </Html>

      {isNear && (
        <Html
          center
          position={[
            0,
            2.85,
            0.2,
          ]}
          distanceFactor={6}
          style={{
            pointerEvents:
              "none",
            width:
              "290px",
            padding:
              "14px 16px",
            border:
              researchReady
                ? "1px solid rgba(99,245,255,.5)"
                : "1px solid rgba(126,159,164,.28)",
            borderRadius:
              "12px",
            background:
              "rgba(5,10,14,.94)",
            color:
              "#ffffff",
            fontFamily:
              "Inter, system-ui, sans-serif",
            boxShadow:
              researchReady
                ? "0 0 28px rgba(43,218,235,.14)"
                : "0 8px 26px rgba(0,0,0,.32)",
          }}
        >
          <div
            style={{
              color:
                researchReady
                  ? "#72effb"
                  : "#718c91",
              fontSize:
                "9px",
              fontWeight:
                900,
              letterSpacing:
                ".18em",
              marginBottom:
                "7px",
            }}
          >
            ARES RESEARCH SYSTEM
          </div>

          <div
            style={{
              fontSize:
                "15px",
              fontWeight:
                900,
              marginBottom:
                "7px",
            }}
          >
            {researchCompleted
              ? "RESEARCH COMPLETE"
              : researchAnalyzing
                ? "ANALYZING DISCOVERY"
                : researchState === "loading"
                  ? "CONNECTING RESEARCH LINK"
                  : researchState === "error"
                    ? "RESEARCH LINK FAILED"
                    : researchReady
                      ? "DISCOVERY READY FOR ANALYSIS"
                      : "NO RESEARCH SAMPLE AVAILABLE"}
          </div>

          {researchReady &&
            mission && (
              <>
                <div
                  style={{
                    color:
                      "#b6c8cc",
                    fontSize:
                      "11px",
                    lineHeight:
                      1.45,
                    marginBottom:
                      "9px",
                  }}
                >
                  {mission.title}
                </div>

                <div
                  style={{
                    color:
                      "#7defff",
                    fontSize:
                      "10px",
                    fontWeight:
                      800,
                    letterSpacing:
                      ".08em",
                  }}
                >
                  {researchCompleted
                    ? "ANALYSIS ARCHIVED"
                    : researchAnalyzing
                      ? `ANALYZING · ${Math.round(
                          researchProgress * 100,
                        )}%`
                      : researchState === "loading"
                        ? "ESTABLISHING SECURE LINK"
                        : researchState === "error"
                          ? "E — RETRY ANALYSIS LINK"
                          : "E — START ANALYSIS"}
                </div>
              </>
            )}

          {!researchReady && (
            <div
              style={{
                color:
                  "#84979b",
                fontSize:
                  "10px",
                lineHeight:
                  1.45,
              }}
            >
              Complete an Ares field mission to recover a research sample.
            </div>
          )}
        </Html>
      )}
    </group>
  );
}

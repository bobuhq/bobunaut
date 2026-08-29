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

import {
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

type MarsDiscoveryPointProps = {
  targetRef: React.RefObject<THREE.Group | null>;
  position?: [
    number,
    number,
  ];
};

const DISCOVERY_RADIUS = 5.5;
const SCAN_DURATION_SECONDS = 2.4;

export function MarsDiscoveryPoint({
  targetRef,
  position = [
    18,
    -28,
  ],
}: MarsDiscoveryPointProps) {
  const markerRef =
    useRef<THREE.Group | null>(
      null,
    );

  const terrainDataRef =
    useRef<AresGenesisTerrainData | null>(
      null,
    );

  const scanHeldRef =
    useRef(false);

  const scanProgressRef =
    useRef(0);

  const lastDisplayedProgressRef =
    useRef(-1);

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
    isScanned,
    setIsScanned,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    loadAresGenesisTerrainData()
      .then((terrain) => {
        if (!active) {
          return;
        }

        terrainDataRef.current =
          terrain;

        setTerrainHeight(
          sampleAresGenesisGameplaySurfaceMeters(
            terrain,
            position[0],
            position[1],
          ),
        );
      })
      .catch((error) => {
        console.error(
          "Failed to initialize Mars discovery point",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [
    position,
  ]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.code !== "KeyE" ||
        event.repeat
      ) {
        return;
      }

      scanHeldRef.current = true;
    }

    function handleKeyUp(
      event: KeyboardEvent,
    ) {
      if (
        event.code !== "KeyE"
      ) {
        return;
      }

      scanHeldRef.current = false;
    }

    function resetScanInput() {
      scanHeldRef.current = false;
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "keyup",
      handleKeyUp,
    );

    window.addEventListener(
      "blur",
      resetScanInput,
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

      window.removeEventListener(
        "blur",
        resetScanInput,
      );
    };
  }, []);

  useFrame((state, delta) => {
    const marker =
      markerRef.current;

    const target =
      targetRef.current;

    if (!marker) {
      return;
    }

    if (
      isNear &&
      !isScanned
    ) {
      const pulse =
        1 +
        Math.sin(
          state.clock.elapsedTime *
            2.8,
        ) *
          0.025;

      marker.scale.setScalar(
        pulse,
      );
    } else {
      marker.scale.setScalar(1);
    }

    if (!target) {
      return;
    }

    const dx =
      target.position.x -
      position[0];

    const dz =
      target.position.z -
      position[1];

    const distance =
      Math.sqrt(
        dx * dx +
          dz * dz,
      );

    const nextIsNear =
      distance <=
      DISCOVERY_RADIUS;

    setIsNear(
      (current) =>
        current === nextIsNear
          ? current
          : nextIsNear,
    );

    if (isScanned) {
      return;
    }

    if (
      nextIsNear &&
      scanHeldRef.current
    ) {
      scanProgressRef.current =
        Math.min(
          1,
          scanProgressRef.current +
            delta /
              SCAN_DURATION_SECONDS,
        );
    } else if (
      !scanHeldRef.current
    ) {
      scanProgressRef.current =
        Math.max(
          0,
          scanProgressRef.current -
            delta * 0.45,
        );
    }

    const displayedProgress =
      Math.round(
        scanProgressRef.current *
          100,
      );

    if (
      displayedProgress !==
      lastDisplayedProgressRef.current
    ) {
      lastDisplayedProgressRef.current =
        displayedProgress;

      setScanProgress(
        displayedProgress,
      );
    }

    if (
      scanProgressRef.current >= 1
    ) {
      scanHeldRef.current = false;
      setIsScanned(true);
      setScanProgress(100);
    }
  });

  return (
    <group
      position={[
        position[0],
        terrainHeight,
        position[1],
      ]}
    >
      <group ref={markerRef}>
        <mesh
          position={[
            0,
            0.42,
            0,
          ]}
          rotation={[
            0.08,
            0.35,
            -0.12,
          ]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry
            args={[
              0.72,
              2,
            ]}
          />

          <meshStandardMaterial
            color="#4b2418"
            roughness={0.96}
            metalness={0.02}
          />
        </mesh>

        <mesh
          position={[
            -0.42,
            0.24,
            0.18,
          ]}
          rotation={[
            -0.2,
            0.1,
            0.34,
          ]}
          scale={[
            0.65,
            0.48,
            0.72,
          ]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry
            args={[
              0.52,
              1,
            ]}
          />

          <meshStandardMaterial
            color="#632d1c"
            roughness={0.98}
            metalness={0.01}
          />
        </mesh>

        <mesh
          position={[
            0.46,
            0.18,
            -0.12,
          ]}
          rotation={[
            0.18,
            -0.38,
            0.2,
          ]}
          scale={[
            0.52,
            0.38,
            0.58,
          ]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry
            args={[
              0.46,
              1,
            ]}
          />

          <meshStandardMaterial
            color="#351812"
            roughness={0.98}
            metalness={0.02}
          />
        </mesh>

        <mesh
          position={[
            0.08,
            0.57,
            -0.58,
          ]}
          rotation={[
            0.45,
            0.2,
            0.12,
          ]}
          scale={[
            0.12,
            0.05,
            0.52,
          ]}
        >
          <boxGeometry
            args={[
              1,
              1,
              1,
            ]}
          />

          <meshStandardMaterial
            color={
              isScanned
                ? "#8fffe1"
                : "#8067b8"
            }
            emissive={
              isScanned
                ? "#27c99b"
                : "#24134f"
            }
            emissiveIntensity={
              isNear || isScanned
                ? 1.5
                : 0.18
            }
            roughness={0.55}
          />
        </mesh>

        {isNear && (
          <>
            <mesh
              position={[
                0,
                0.035,
                0,
              ]}
              rotation={[
                -Math.PI / 2,
                0,
                0,
              ]}
            >
              <ringGeometry
                args={[
                  1.15,
                  1.22,
                  64,
                ]}
              />

              <meshBasicMaterial
                color={
                  isScanned
                    ? "#62ffd1"
                    : "#8b66ff"
                }
                transparent
                opacity={
                  isScanned
                    ? 0.82
                    : 0.62
                }
                side={
                  THREE.DoubleSide
                }
              />
            </mesh>

            <pointLight
              position={[
                0,
                0.6,
                0,
              ]}
              color={
                isScanned
                  ? "#62ffd1"
                  : "#8b66ff"
              }
              intensity={
                isScanned
                  ? 1.35
                  : 0.65
              }
              distance={5}
              decay={2}
            />
          </>
        )}
      </group>

      {isNear && (
        <Html
          position={[
            0,
            1.65,
            0,
          ]}
          center
          distanceFactor={7}
          style={{
            pointerEvents:
              "none",
            userSelect:
              "none",
          }}
        >
          <div
            style={{
              minWidth:
                "190px",
              padding:
                "12px 14px",
              border:
                isScanned
                  ? "1px solid rgba(98,255,209,0.58)"
                  : "1px solid rgba(139,102,255,0.58)",
              borderRadius:
                "12px",
              background:
                "rgba(5,7,18,0.88)",
              boxShadow:
                isScanned
                  ? "0 0 28px rgba(98,255,209,0.18)"
                  : "0 0 28px rgba(122,92,255,0.20)",
              backdropFilter:
                "blur(8px)",
              color:
                "#ffffff",
              fontFamily:
                "Inter, system-ui, sans-serif",
              textAlign:
                "center",
            }}
          >
            <div
              style={{
                fontSize:
                  "10px",
                letterSpacing:
                  "0.18em",
                color:
                  isScanned
                    ? "#62ffd1"
                    : "#9b86ff",
                marginBottom:
                  "5px",
              }}
            >
              GEOLOGICAL ANOMALY
            </div>

            <div
              style={{
                fontSize:
                  "13px",
                fontWeight:
                  700,
              }}
            >
              {isScanned
                ? "SCAN COMPLETE"
                : "HOLD E TO SCAN"}
            </div>

            {!isScanned && (
              <div
                style={{
                  width:
                    "150px",
                  height:
                    "4px",
                  margin:
                    "9px auto 0",
                  borderRadius:
                    "999px",
                  overflow:
                    "hidden",
                  background:
                    "rgba(255,255,255,0.12)",
                }}
              >
                <div
                  style={{
                    width: `${scanProgress}%`,
                    height:
                      "100%",
                    background:
                      "#8b66ff",
                    transition:
                      "width 60ms linear",
                  }}
                />
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

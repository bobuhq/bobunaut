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
  accessMyAresMissionTerminal,
  type AresHiddenMission,
} from "./AresHiddenMissionService";

type Props = {
  targetRef:
    React.RefObject<THREE.Group | null>;

  worldPosition: {
    x: number;
    z: number;
  };

  onMission:
    (
      mission:
        AresHiddenMission,
    ) => void;
};

const ACCESS_DISTANCE =
  2.8;

export function AresMissionTerminal({
  targetRef,
  worldPosition,
  onMission,
}: Props) {
  const screenRef =
    useRef<THREE.MeshStandardMaterial | null>(
      null,
    );

  const nearRef =
    useRef(false);

  const busyRef =
    useRef(false);

  const [
    isNear,
    setIsNear,
  ] = useState(false);

  const [
    mission,
    setMission,
  ] =
    useState<AresHiddenMission | null>(
      null,
    );

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useFrame(
    ({
      clock,
    }) => {
      if (
        screenRef.current
      ) {
        screenRef.current.emissiveIntensity =
          1.3 +
          Math.sin(
            clock.elapsedTime *
              1.8,
          ) *
            0.14;
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
    },
  );

  useEffect(() => {
    async function accessTerminal() {
      if (
        !nearRef.current ||
        busyRef.current
      ) {
        return;
      }

      busyRef.current =
        true;

      setBusy(true);
      setError(null);

      try {
        const result =
          await accessMyAresMissionTerminal();

        setMission(
          result,
        );

        onMission(
          result,
        );
      } catch (
        accessError
      ) {
        console.error(
          "Failed to access Ares mission terminal",
          accessError,
        );

        setError(
          "TERMINAL LINK FAILED",
        );
      } finally {
        busyRef.current =
          false;

        setBusy(false);
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
        !nearRef.current
      ) {
        return;
      }

      event.preventDefault();

      void accessTerminal();
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    onMission,
  ]);

  return (
    <group
      position={[
        0,
        0,
        -3.7,
      ]}
    >
      <mesh
        position={[
          0,
          0.66,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            2.8,
            1.2,
            1.2,
          ]}
        />

        <meshStandardMaterial
          color="#171a20"
          metalness={0.74}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.08,
          0.61,
        ]}
        rotation={[
          -0.06,
          0,
          0,
        ]}
      >
        <planeGeometry
          args={[
            2.05,
            0.58,
          ]}
        />

        <meshStandardMaterial
          ref={
            screenRef
          }
          color="#7754d6"
          emissive="#6542c2"
          emissiveIntensity={1.3}
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.12,
          0.2,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            3.15,
            0.14,
            1.7,
          ]}
        />

        <meshStandardMaterial
          color="#292c33"
          metalness={0.58}
          roughness={0.4}
        />
      </mesh>

      <Html
        center
        position={[
          0,
          1.55,
          0.66,
        ]}
        distanceFactor={7}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          color:
            "#e4dcff",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize:
            "9px",
          fontWeight:
            900,
          letterSpacing:
            "0.18em",
        }}
      >
        MISSION TERMINAL
      </Html>

      {isNear && (
        <Html
          center
          position={[
            0,
            2.05,
            0.8,
          ]}
          distanceFactor={6}
        >
          <div
            style={{
              width: "260px",
              padding: "12px 14px",
              border:
                "1px solid rgba(177,108,235,.45)",
              borderRadius: "12px",
              background:
                "rgba(6,6,14,.9)",
              boxShadow:
                "0 0 30px rgba(112,46,170,.22)",
              color: "#fff",
              fontFamily:
                "Inter, system-ui, sans-serif",
              textAlign: "left",
              pointerEvents: "none",
            }}
          >
          {!mission && !error && (
            <>
              <div
                style={{
                  fontSize:
                    "10px",
                  fontWeight:
                    900,
                  letterSpacing:
                    ".16em",
                  color:
                    "#cda2ff",
                }}
              >
                COMMAND TERMINAL
              </div>

              <div
                style={{
                  marginTop:
                    "7px",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                }}
              >
                {busy
                  ? "CONNECTING..."
                  : "E — ACCESS TERMINAL"}
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                fontSize:
                  "11px",
                fontWeight:
                  900,
                color:
                  "#ff8a8a",
              }}
            >
              {error}
            </div>
          )}

          {mission && (
            <>
              <div
                style={{
                  fontSize:
                    "9px",
                  fontWeight:
                    900,
                  letterSpacing:
                    ".14em",
                  color:
                    "#b88be8",
                }}
              >
                HIDDEN ARES MISSION
              </div>

              <div
                style={{
                  marginTop:
                    "7px",
                  fontSize:
                    "14px",
                  fontWeight:
                    900,
                }}
              >
                {mission.title}
              </div>

              <div
                style={{
                  marginTop:
                    "7px",
                  fontSize:
                    "10px",
                  lineHeight:
                    1.45,
                  color:
                    "#d8d2df",
                }}
              >
                {mission.briefing}
              </div>

              <div
                style={{
                  marginTop:
                    "9px",
                  fontSize:
                    "9px",
                  fontWeight:
                    900,
                  letterSpacing:
                    ".1em",
                  color:
                    "#c79af1",
                }}
              >
                REWARD {mission.rewardGp} GP
              </div>
            </>
          )}
        </div>
        </Html>
      )}
    </group>
  );
}

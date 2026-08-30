import {
  useRef,
  type RefObject,
} from "react";

import {
  Html,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import type {
  AresHiddenMission,
} from "../missions/AresHiddenMissionService";

export type AresGuidanceNavigation = {
  kind:
    | "hub"
    | "terminal"
    | "mission"
    | "explore";

  distance: number;
  bearing: number;
  relativeAngle: number;
  near: boolean;
};

type Props = {
  targetRef:
    RefObject<THREE.Group | null>;

  mission:
    AresHiddenMission | null;

  onNavigation:
    (
      navigation:
        AresGuidanceNavigation | null,
    ) => void;
};

const HUB_X = -44;
const HUB_Z = -68;

const TERMINAL_X = -44;
const TERMINAL_Z = -71.7;

function CommandHubMarker({
  visible,
}: {
  visible: boolean;
}) {
  const groupRef =
    useRef<THREE.Group | null>(
      null,
    );

  useFrame(
    ({
      clock,
    }) => {
      if (
        !visible ||
        !groupRef.current
      ) {
        return;
      }

      const pulse =
        1 +
        Math.sin(
          clock.elapsedTime * 2.5,
        ) *
          0.08;

      groupRef.current.scale.setScalar(
        pulse,
      );
    },
  );

  if (!visible) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={[
        HUB_X,
        8,
        HUB_Z,
      ]}
    >
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.9,
            0.07,
            12,
            48,
          ]}
        />

        <meshBasicMaterial
          color="#63f5ff"
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[
          0,
          -3.2,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.025,
            0.025,
            6.4,
            8,
          ]}
        />

        <meshBasicMaterial
          color="#54ff88"
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        color="#63f5ff"
        intensity={5}
        distance={18}
        decay={2}
      />

      <Html
        center
        distanceFactor={9}
        style={{
          pointerEvents:
            "none",
          whiteSpace:
            "nowrap",
          padding:
            "7px 12px",
          border:
            "1px solid rgba(99,245,255,.72)",
          borderRadius:
            "999px",
          background:
            "rgba(3,10,16,.92)",
          boxShadow:
            "0 0 24px rgba(99,245,255,.4)",
          color:
            "#e5ffff",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize:
            "9px",
          fontWeight:
            900,
          letterSpacing:
            ".16em",
        }}
      >
        COMMAND HUB
      </Html>
    </group>
  );
}

export function AresGuidanceSystem({
  targetRef,
  mission,
  onNavigation,
}: Props) {
  const cameraForwardRef =
    useRef(
      new THREE.Vector3(),
    );

  const lastEmitRef =
    useRef(0);

  const lastKindRef =
    useRef<
      AresGuidanceNavigation["kind"] | null
    >(null);

  useFrame(
    ({
      camera,
      clock,
    }) => {
      const player =
        targetRef.current;

      if (!player) {
        return;
      }

      if (
        clock.elapsedTime -
          lastEmitRef.current <
        0.08
      ) {
        return;
      }

      lastEmitRef.current =
        clock.elapsedTime;

      let kind:
        AresGuidanceNavigation["kind"] =
        "hub";

      let targetX = HUB_X;
      let targetZ = HUB_Z;
      let nearRadius = 10;

      if (
        mission?.status ===
        "accepted"
      ) {
        kind = "mission";

        targetX =
          mission.targetX;

        targetZ =
          mission.targetZ;

        nearRadius =
          mission.targetRadius;
      } else if (
        mission?.status ===
          "claimed" ||
        mission?.status ===
          "completed"
      ) {
        onNavigation({
          kind: "explore",
          distance: 0,
          bearing: 0,
          relativeAngle: 0,
          near: false,
        });

        return;
      } else {
        const hubDx =
          player.position.x -
          HUB_X;

        const hubDz =
          player.position.z -
          HUB_Z;

        const insideHub =
          Math.abs(hubDx) <
            5.05 &&
          Math.abs(hubDz) <
            5.95;

        if (insideHub) {
          kind = "terminal";
          targetX = TERMINAL_X;
          targetZ = TERMINAL_Z;
          nearRadius = 2.8;
        }
      }

      const dx =
        targetX -
        player.position.x;

      const dz =
        targetZ -
        player.position.z;

      const distance =
        Math.sqrt(
          dx * dx +
            dz * dz,
        );

      camera.getWorldDirection(
        cameraForwardRef.current,
      );

      cameraForwardRef.current.y =
        0;

      if (
        cameraForwardRef.current.lengthSq() >
        0
      ) {
        cameraForwardRef.current.normalize();
      }

      const cameraYaw =
        Math.atan2(
          cameraForwardRef.current.x,
          -cameraForwardRef.current.z,
        );

      const targetYaw =
        Math.atan2(
          dx,
          -dz,
        );

      let relativeAngle =
        THREE.MathUtils.radToDeg(
          targetYaw -
            cameraYaw,
        );

      while (
        relativeAngle > 180
      ) {
        relativeAngle -= 360;
      }

      while (
        relativeAngle < -180
      ) {
        relativeAngle += 360;
      }

      const bearing =
        (
          THREE.MathUtils.radToDeg(
            targetYaw,
          ) +
          360
        ) %
        360;

      lastKindRef.current =
        kind;

      onNavigation({
        kind,
        distance,
        bearing,
        relativeAngle,
        near:
          distance <=
          nearRadius,
      });
    },
  );

  return (
    <CommandHubMarker
      visible={
        mission === null
      }
    />
  );
}

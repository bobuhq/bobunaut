import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  Html,
  useAnimations,
  useGLTF,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import type {
  AresRemoteBuilder as AresRemoteBuilderState,
} from "./AresPresenceEngine";

const BOBU_EXPLORER_MODEL_URL =
  "/models/bobu/bobu-explorer-v2-clean.glb";

interface AresRemoteBuilderProps {
  builder: AresRemoteBuilderState;
}

export function AresRemoteBuilder({
  builder,
}: AresRemoteBuilderProps) {
  const groupRef =
    useRef<THREE.Group | null>(null);

  const targetPosition =
    useRef(
      new THREE.Vector3(
        builder.transform.x,
        builder.transform.y,
        builder.transform.z,
      ),
    );

  const targetRotation =
    useRef(
      builder.transform.rotationY,
    );

  const gltf =
    useGLTF(
      BOBU_EXPLORER_MODEL_URL,
    );

  const scene =
    useMemo(
      () =>
        cloneSkeleton(gltf.scene),
      [gltf.scene],
    );

  const {
    actions,
  } =
    useAnimations(
      gltf.animations,
      scene,
    );

  useEffect(() => {
    scene.traverse((object) => {
      if (
        object instanceof
        THREE.Mesh
      ) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  type MoveClip = "BOBU_Walk" | "BOBU_Run";
  type AttackClip = "BOBU_Punch" | "BOBU_SpinAttack";

  const locomotionRef = useRef<MoveClip | null>(null);
  const desiredMovementRef = useRef<MoveClip | null>(null);
  const activeAttackRef = useRef<AttackClip | null>(null);
  const attackRemainingRef = useRef(0);
  const lastAttackIdRef = useRef<string | null>(null);

  const previousPosition = useRef(
    new THREE.Vector3(
      builder.transform.x,
      builder.transform.y,
      builder.transform.z,
    ),
  );

  const previousUpdateAt = useRef(builder.updatedAt);

  useEffect(() => {
    const t = builder.transform;
    const previous = previousPosition.current;

    const seconds = Math.max(
      0.001,
      (builder.updatedAt - previousUpdateAt.current) / 1000,
    );

    const speed = Math.hypot(
      t.x - previous.x,
      t.z - previous.z,
    ) / seconds;

    desiredMovementRef.current =
      speed > 12 ? "BOBU_Run" :
      speed > 0.12 ? "BOBU_Walk" : null;

    previous.set(t.x, t.y, t.z);
    previousUpdateAt.current = builder.updatedAt;

    const attack = t.attack;

    if (!attack || attack.id === lastAttackIdRef.current) return;



    const clip: AttackClip = attack.kind === "punch"
      ? "BOBU_Punch"
      : "BOBU_SpinAttack";

    const action = actions[clip];
    if (!action) return;

    lastAttackIdRef.current = attack.id;

    if (locomotionRef.current) {
      actions[locomotionRef.current]?.fadeOut(0.12);
      locomotionRef.current = null;
    }

    if (activeAttackRef.current) {
      actions[activeAttackRef.current]?.stop();
    }

    activeAttackRef.current = clip;
    attackRemainingRef.current =
      attack.kind === "punch" ? 0.7 : 1.5;

    action.reset()
      .setLoop(THREE.LoopOnce, 1)
      .setEffectiveTimeScale(attack.kind === "punch" ? 1.3 : 1)
      .setEffectiveWeight(1)
      .fadeIn(0.12)
      .play();

    action.clampWhenFinished = false;

  }, [builder.transform, builder.updatedAt, actions]);

  useEffect(() => {
    return () => {
      for (const action of Object.values(actions)) action?.stop();
    };
  }, [actions]);

  useFrame((_, delta) => {
    if (activeAttackRef.current) {
      attackRemainingRef.current -= Math.min(delta, 0.1);

      if (attackRemainingRef.current > 0) return;

      actions[activeAttackRef.current]?.fadeOut(0.12);
      activeAttackRef.current = null;
      locomotionRef.current = null;
    }

    const desired = desiredMovementRef.current;

    if (desired === locomotionRef.current) return;

    if (locomotionRef.current) {
      actions[locomotionRef.current]?.fadeOut(0.16);
    }

    if (desired) {
      actions[desired]?.reset()
        .setLoop(THREE.LoopRepeat, Infinity)
        .setEffectiveTimeScale(desired === "BOBU_Run" ? 1.18 : 1)
        .setEffectiveWeight(1)
        .fadeIn(0.16)
        .play();
    }

    locomotionRef.current = desired;
  });

  useEffect(() => {
    targetPosition.current.set(
      builder.transform.x,
      builder.transform.y,
      builder.transform.z,
    );

    targetRotation.current =
      builder.transform.rotationY;
  }, [
    builder.transform.x,
    builder.transform.y,
    builder.transform.z,
    builder.transform.rotationY,
  ]);

  useFrame((_, delta) => {
    const group =
      groupRef.current;

    if (!group) {
      return;
    }

    const positionAlpha =
      1 -
      Math.exp(
        -12 * delta,
      );

    group.position.lerp(
      targetPosition.current,
      positionAlpha,
    );

    let rotationDelta =
      targetRotation.current -
      group.rotation.y;

    rotationDelta =
      THREE.MathUtils.euclideanModulo(
        rotationDelta + Math.PI,
        Math.PI * 2,
      ) - Math.PI;

    group.rotation.y +=
      rotationDelta *
      Math.min(
        1,
        delta * 12,
      );
  });

  return (
    <group
      ref={groupRef}
      position={[
        builder.transform.x,
        builder.transform.y,
        builder.transform.z,
      ]}
      rotation={[
        0,
        builder.transform.rotationY,
        0,
      ]}
    >
      <group
        scale={[
          0.82,
          0.82,
          0.82,
        ]}
      >
        <primitive
          object={scene}
        />
      </group>

      <Html
        position={[
          0,
          2.35,
          0,
        ]}
        center
        distanceFactor={11}
        style={{
          pointerEvents:
            "none",
          userSelect:
            "none",
        }}
      >
        <div
          style={{
            whiteSpace:
              "nowrap",
            padding:
              "5px 9px",
            border:
              "1px solid rgba(99,245,255,0.35)",
            borderRadius:
              "999px",
            background:
              "rgba(5,7,18,0.78)",
            color:
              "#ffffff",
            fontSize:
              "10px",
            fontWeight:
              800,
            letterSpacing:
              "0.08em",
            boxShadow:
              "0 0 14px rgba(99,245,255,0.12)",
          }}
        >
          {builder.displayName}
        </div>
      </Html>
    </group>
  );
}

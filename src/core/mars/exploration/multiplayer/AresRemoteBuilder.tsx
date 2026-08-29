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

import type {
  AresRemoteBuilder as AresRemoteBuilderState,
} from "./AresPresenceEngine";

const BOBU_EXPLORER_MODEL_URL =
  "/models/bobu/bobu-explorer-v1.glb";

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
        gltf.scene.clone(true),
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

  useEffect(() => {
    const idle =
      actions.Idle;

    if (!idle) {
      return;
    }

    idle
      .reset()
      .fadeIn(0.16)
      .play();

    return () => {
      idle.fadeOut(0.16);
      idle.stop();
    };
  }, [actions]);

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

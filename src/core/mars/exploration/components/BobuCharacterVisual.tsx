import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  useAnimations,
  useGLTF,
} from "@react-three/drei";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

const BOBU_EXPLORER_MODEL_URL =
  "/models/bobu/bobu-explorer-v1.glb";

type BobuAnimationName =
  | "Idle"
  | "Walk"
  | "Run";

const MOVEMENT_KEYS =
  new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ]);

type BobuCharacterVisualProps = {
  stairStateRef?:
    React.MutableRefObject<boolean>;
  onSpinReadyChange?: (ready: boolean) => void;
  onLeftArmReadyChange?: (ready: boolean) => void;
};

export function BobuCharacterVisual({
  stairStateRef,
  onSpinReadyChange,
  onLeftArmReadyChange,
}: BobuCharacterVisualProps) {
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

  const leftArm = useMemo(() => {
    const joint = scene.getObjectByName("Arm_L");
    if (!joint?.isObject3D || !(joint instanceof THREE.Bone)) return null;

    const shoulderCap = joint.children.find(child => child.name === "Shoulder_-1");
    if (!(shoulderCap instanceof THREE.Mesh)) return null;

    return {
      joint,
      shoulderCap,
      capPosition: shoulderCap.position.clone(),
      capRotation: shoulderCap.quaternion.clone(),
      baseRotation: new THREE.Quaternion(),
      rotation: new THREE.Quaternion(),
      capCorrection: new THREE.Quaternion(),
      outwardAxis: new THREE.Vector3(0, 0, -1),
    };
  }, [scene]);
  const armElapsedRef = useRef(-1);
  const armOverlayAppliedRef = useRef(false);

  function restoreLeftArmPose() {
    if (!leftArm || !armOverlayAppliedRef.current) return;
    leftArm.joint.quaternion.copy(leftArm.baseRotation);
    leftArm.shoulderCap.position.copy(leftArm.capPosition);
    leftArm.shoulderCap.quaternion.copy(leftArm.capRotation);
    armOverlayAppliedRef.current = false;
  }

  // Restore the clip pose before Drei's mixer advances, including when the
  // mixer reuses an unchanged value for a held keyframe.
  useFrame(restoreLeftArmPose, -1);

  useEffect(() => {
    if (!leftArm || !onLeftArmReadyChange) return;

    function handleLeftArm() {
      if (armElapsedRef.current < 0) armElapsedRef.current = 0;
    }

    window.addEventListener("bobu:ares-left-arm", handleLeftArm);
    onLeftArmReadyChange(true);
    return () => {
      window.removeEventListener("bobu:ares-left-arm", handleLeftArm);
      restoreLeftArmPose();
      armElapsedRef.current = -1;
      onLeftArmReadyChange(false);
    };
  }, [leftArm, onLeftArmReadyChange]);

  const {
    actions,
    names,
  } =
    useAnimations(
      gltf.animations,
      scene,
    );

  const pressedMovementKeys =
    useRef(
      new Set<string>(),
    );

  const runningRef =
    useRef(false);

  const activeAnimationRef =
    useRef<BobuAnimationName | null>(
      null,
    );

  const stairPhaseRef =
    useRef(0);

  const visualGroupRef = useRef<THREE.Group>(null);
  const spinElapsedRef = useRef(-1);

  useEffect(() => {
    if (!onSpinReadyChange) return;

    function handleSpin(event: Event) {
      if ((event as CustomEvent<unknown>).detail === "spin") {
        spinElapsedRef.current = 0;
      }
    }

    window.addEventListener("bobu:ares-attack", handleSpin);
    onSpinReadyChange(true);
    return () => {
      window.removeEventListener("bobu:ares-attack", handleSpin);
      onSpinReadyChange(false);
      spinElapsedRef.current = -1;
      if (visualGroupRef.current) visualGroupRef.current.rotation.y = 0;
    };
  }, [onSpinReadyChange]);

  const legLeft =
    useMemo(
      () =>
        scene.getObjectByName(
          "Leg_L",
        ),
      [scene],
    );

  const legRight =
    useMemo(
      () =>
        scene.getObjectByName(
          "Leg_R",
        ),
      [scene],
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
    function playAnimation(
      next:
        BobuAnimationName,
    ) {
      if (
        activeAnimationRef.current ===
        next
      ) {
        return;
      }

      const nextAction =
        actions[next];

      if (!nextAction) {
        console.warn(
          `BOBU animation not found: ${next}`,
          names,
        );
        return;
      }

      const previousName =
        activeAnimationRef.current;

      if (previousName) {
        actions[
          previousName
        ]
          ?.fadeOut(
            0.16,
          );
      }

      nextAction
        .reset()
        .setEffectiveTimeScale(
          next === "Run"
            ? 1.18
            : 1,
        )
        .setEffectiveWeight(
          1,
        )
        .fadeIn(
          0.16,
        )
        .play();

      activeAnimationRef.current =
        next;
    }

    function updateAnimation() {
      const moving =
        pressedMovementKeys.current
          .size >
        0;

      if (!moving) {
        playAnimation(
          "Idle",
        );
        return;
      }

      playAnimation(
        runningRef.current
          ? "Run"
          : "Walk",
      );
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        MOVEMENT_KEYS.has(
          event.code,
        )
      ) {
        pressedMovementKeys.current.add(
          event.code,
        );
      }

      if (
        event.code ===
          "ShiftLeft" ||
        event.code ===
          "ShiftRight"
      ) {
        runningRef.current =
          true;
      }

      updateAnimation();
    }

    function handleKeyUp(
      event: KeyboardEvent,
    ) {
      if (
        MOVEMENT_KEYS.has(
          event.code,
        )
      ) {
        pressedMovementKeys.current.delete(
          event.code,
        );
      }

      if (
        event.code ===
          "ShiftLeft" ||
        event.code ===
          "ShiftRight"
      ) {
        runningRef.current =
          false;
      }

      updateAnimation();
    }

    function handleBlur() {
      pressedMovementKeys.current.clear();
      runningRef.current =
        false;

      updateAnimation();
    }

    playAnimation(
      "Idle",
    );

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
      handleBlur,
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
        handleBlur,
      );

      for (
        const action of
        Object.values(
          actions,
        )
      ) {
        action?.stop();
      }
    };
  }, [
    actions,
    names,
  ]);

  useFrame(
    (
      _state,
      delta,
    ) => {
      const visualGroup = visualGroupRef.current;
      if (visualGroup && spinElapsedRef.current >= 0) {
        spinElapsedRef.current += delta;
        const progress = Math.min(1, spinElapsedRef.current / 0.9);
        visualGroup.rotation.y = progress * Math.PI * 2;
        if (progress === 1) {
          spinElapsedRef.current = -1;
          visualGroup.rotation.y = 0;
        }
      }

      if (leftArm && armElapsedRef.current >= 0) {
        armElapsedRef.current += delta;
        const progress = Math.min(1, armElapsedRef.current / 0.72);
        if (progress === 1) {
          armElapsedRef.current = -1;
        } else {
          const { joint, shoulderCap, baseRotation, rotation, capCorrection } = leftArm;
          baseRotation.copy(joint.quaternion);
          const lift = Math.sin(Math.PI * progress) ** 2;
          rotation.setFromAxisAngle(leftArm.outwardAxis, 0.68 * lift);
          joint.quaternion.premultiply(rotation);

          // The cap overlaps the neck guard during an outward roll. Keep it
          // in the clip pose by canceling the overlay in joint-local space.
          capCorrection.copy(joint.quaternion).invert().multiply(baseRotation);
          shoulderCap.position.copy(leftArm.capPosition).applyQuaternion(capCorrection);
          shoulderCap.quaternion.copy(leftArm.capRotation).premultiply(capCorrection);
          armOverlayAppliedRef.current = true;
        }
      }

      const onStairs =
        stairStateRef?.current === true;

      const moving =
        pressedMovementKeys.current
          .size > 0;

      if (
        !legLeft ||
        !legRight
      ) {
        return;
      }

      if (
        onStairs &&
        moving
      ) {
        stairPhaseRef.current +=
          delta *
          (
            runningRef.current
              ? 9
              : 6.5
          );

        const phase =
          stairPhaseRef.current;

        const leftLift =
          Math.max(
            0,
            Math.sin(
              phase,
            ),
          );

        const rightLift =
          Math.max(
            0,
            Math.sin(
              phase +
                Math.PI,
            ),
          );

        const leftTarget =
          leftLift * 0.48;

        const rightTarget =
          rightLift * 0.48;

        legLeft.rotation.x =
          THREE.MathUtils.lerp(
            legLeft.rotation.x,
            leftTarget,
            Math.min(
              1,
              delta * 14,
            ),
          );

        legRight.rotation.x =
          THREE.MathUtils.lerp(
            legRight.rotation.x,
            rightTarget,
            Math.min(
              1,
              delta * 14,
            ),
          );

        return;
      }

      stairPhaseRef.current = 0;
    },
  );

  return (
    <group
      ref={visualGroupRef}
      position={[
        0,
        0,
        0,
      ]}
      rotation={[
        0,
        0,
        0,
      ]}
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
  );
}

useGLTF.preload(
  BOBU_EXPLORER_MODEL_URL,
);

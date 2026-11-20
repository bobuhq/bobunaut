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
};

export function BobuCharacterVisual({
  stairStateRef,
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

  const {
    actions,
    names,
    mixer,
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

  // BOBU_V1_LOCAL_COMBAT_TEST
  const combatGroupRef = useRef<THREE.Group>(null);
  const punchActionRef = useRef<THREE.AnimationAction | null>(null);
  const punchElapsedRef = useRef(0);
  const spinElapsedRef = useRef(-1);

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

  useEffect(() => {
    const arm = scene.getObjectByName("Arm_R");

    if (!arm) {
      console.warn("BOBU V1: right arm unavailable");
      return;
    }

    const base = arm.rotation.x;

    const punchClip = new THREE.AnimationClip(
      "BOBU_V1_LocalPunch",
      0.6,
      [
        new THREE.NumberKeyframeTrack(
          "Arm_R.rotation[x]",
          [0, 0.12, 0.25, 0.43, 0.6],
          [base, base - 0.35, base - 1.15, base - 0.35, base],
        ),
      ],
    );

    const punch = mixer.clipAction(punchClip, scene);
    punch.setLoop(THREE.LoopOnce, 1);
    punch.clampWhenFinished = true;
    punchActionRef.current = punch;

    function onAttack(event: Event) {
      const kind = (event as CustomEvent<string>).detail;

      if (kind === "punch") {
        if (spinElapsedRef.current >= 0) return;

        punch.stop();
        punch.reset();
        punch.setEffectiveWeight(1);
        punch.fadeIn(0.08).play();
        punchElapsedRef.current = 0.001;
      }

      if (kind === "spin") {
        if (punchElapsedRef.current > 0) return;
        spinElapsedRef.current = 0;
      }
    }

    window.addEventListener("bobu:ares-attack", onAttack);

    return () => {
      window.removeEventListener("bobu:ares-attack", onAttack);
      punch.stop();
      mixer.uncacheAction(punchClip, scene);
      punchActionRef.current = null;
      if (combatGroupRef.current) {
        combatGroupRef.current.rotation.y = 0;
      }
    };
  }, [mixer, scene]);

  useFrame((_state, delta) => {
    if (punchElapsedRef.current > 0) {
      punchElapsedRef.current += delta;
      if (punchElapsedRef.current >= 0.6) {
        punchActionRef.current?.stop();
        punchElapsedRef.current = 0;
      } else if (punchElapsedRef.current >= 0.42) {
        punchActionRef.current?.fadeOut(0.16);
      }
    }

    if (spinElapsedRef.current >= 0) {
      spinElapsedRef.current += delta;
      // BOBU_V1_FULL_360_SPIN
      // Constant angular speed ensures the entire turn is visible.
      const duration = 0.9;
      const progress = Math.min(
        1,
        spinElapsedRef.current / duration,
      );

      if (combatGroupRef.current) {
        combatGroupRef.current.rotation.y =
          THREE.MathUtils.lerp(0, Math.PI * 2, progress);
      }

      if (progress >= 1) {
        spinElapsedRef.current = -1;
        if (combatGroupRef.current) {
          // 2 PI and 0 are the same facing direction.
          combatGroupRef.current.rotation.y = 0;
        }
      }
    }
  });

  useFrame(
    (
      _state,
      delta,
    ) => {
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
      ref={combatGroupRef}
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

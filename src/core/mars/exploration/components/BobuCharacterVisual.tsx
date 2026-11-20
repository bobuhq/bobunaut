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
import {
  attachBobuEnergySword,
  type BobuSwordMounts,
} from "./BobuEnergySword";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

// BOBU_EXPLORER_V2_LOCAL

const BOBU_EXPLORER_MODEL_URL =
  "/models/bobu/bobu-explorer-v2.glb";

type BobuAnimationName =
  | "BOBU_Walk"
  | "BOBU_Run";

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
  analogMovementRef?: React.MutableRefObject<{ x: number; y: number }>;
};

export function BobuCharacterVisual({
  stairStateRef,
  analogMovementRef,
}: BobuCharacterVisualProps) {
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

  const swordMountsRef =
    useRef<BobuSwordMounts | null>(null);

  useEffect(() => {
    const mounts = attachBobuEnergySword(scene);
    swordMountsRef.current = mounts;

    return () => {
      swordMountsRef.current = null;
      mounts?.dispose();
    };
  }, [scene]);

  const attackClipRef = useRef<
    "BOBU_Punch" | "BOBU_SpinAttack" | null
  >(null);

  const attackEndRef = useRef(0);

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
          next === "BOBU_Run"
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
      if (attackClipRef.current) return;

      const moving =
        pressedMovementKeys.current
          .size >
        0;

      if (!moving) {
        const previous = activeAnimationRef.current;
        if (previous) actions[previous]?.fadeOut(0.16);
        activeAnimationRef.current = null;
        return;
      }

      playAnimation(
        runningRef.current
          ? "BOBU_Run"
          : "BOBU_Walk",
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

    // The V2 export has no Idle clip; its rest pose is used.

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
    function startAttack(kind: "punch" | "spin") {
      const now = performance.now();

      if (attackClipRef.current || now < attackEndRef.current) {
        return;
      }

      const clip = kind === "punch"
        ? "BOBU_Punch"
        : "BOBU_SpinAttack";

      const action = actions[clip];
      if (!action) {
        console.warn("BOBU attack animation unavailable:", clip);
        return;
      }

      const previous = activeAnimationRef.current;
      if (previous) actions[previous]?.fadeOut(0.12);

      attackClipRef.current = clip;

      // Boxing Practice is a long training clip.
      // Use a short, interruptible attack window.
      const durationMs = kind === "punch" ? 700 : 1500;
      attackEndRef.current = now + durationMs;

      action
        .reset()
        .setLoop(THREE.LoopOnce, 1)
        .setEffectiveTimeScale(kind === "punch" ? 1.3 : 1)
        .setEffectiveWeight(1)
        .fadeIn(0.12)
        .play();

      action.clampWhenFinished = false;
    }

    function handleAttackEvent(event: Event) {
      const kind = (event as CustomEvent<string>).detail;

      if (kind === "punch" || kind === "spin") {
        startAttack(kind);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      // Do not attack when clicking HUD, menus or dialogs.
      if (!(event.target instanceof HTMLCanvasElement)) return;

      if (event.button === 0) startAttack("punch");
      if (event.button === 2) {
        event.preventDefault();
        startAttack("spin");
      }
    }

    function handleContextMenu(event: MouseEvent) {
      if (event.target instanceof HTMLCanvasElement) {
        event.preventDefault();
      }
    }

    window.addEventListener(
      "bobu:ares-attack",
      handleAttackEvent,
    );
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener(
        "bobu:ares-attack",
        handleAttackEvent,
      );
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [actions]);

  useFrame(
    (
      _state,
      delta,
    ) => {
      const analog = analogMovementRef?.current;
      const movingNow =
        pressedMovementKeys.current.size > 0 ||
        (!!analog && Math.hypot(analog.x, analog.y) > 0.08);

      const spinning =
        attackClipRef.current === "BOBU_SpinAttack";

      const sword = swordMountsRef.current;
      if (sword) {
        const swordInHand = movingNow || spinning;
        sword.hand.visible = swordInHand;
        sword.back.visible = !swordInHand;
      }

      if (attackClipRef.current) {
        if (performance.now() < attackEndRef.current) {
          return;
        }

        actions[attackClipRef.current]?.fadeOut(0.12);
        attackClipRef.current = null;
        activeAnimationRef.current = null;
      }

      // Reuse analog from the beginning of this frame.
      const analogMoving = !!analog && Math.hypot(
        analog.x, analog.y,
      ) > 0.08;
      const keyboardMoving = pressedMovementKeys.current.size > 0;
      const desired = keyboardMoving || analogMoving
        ? (runningRef.current ? "BOBU_Run" : "BOBU_Walk")
        : null;

      if (desired !== activeAnimationRef.current) {
        if (desired) {
          const old = activeAnimationRef.current;
          if (old) actions[old]?.fadeOut(0.16);
          const next = actions[desired];
          if (next) {
            next.reset().fadeIn(0.16).play();
            activeAnimationRef.current = desired;
          }
        } else {
          const old = activeAnimationRef.current;
          if (old) actions[old]?.fadeOut(0.16);
          activeAnimationRef.current = null;
        }
      }

      const onStairs =
        stairStateRef?.current === true;

      const moving =
        pressedMovementKeys.current.size > 0 ||
        analogMoving;

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

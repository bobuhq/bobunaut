import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const MODEL_URL = "/models/bobu/bobu-explorer-v2-clean.glb";

type MovementClip = "BOBU_Walk" | "BOBU_Run";
type AttackClip = "BOBU_Punch" | "BOBU_SpinAttack";

type Props = {
  multiplayerAttackRef?: MutableRefObject<{
    id: string;
    kind: "punch" | "spin";
    expiresAt: number;
  } | null>;
  stairStateRef?: MutableRefObject<boolean>;
  analogMovementRef?: MutableRefObject<{
    x: number;
    y: number;
  }>;
  onSpinReadyChange?: (ready: boolean) => void;
  onLeftArmReadyChange?: (ready: boolean) => void;
};

const MOVEMENT_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

export function BobuExplorerV2Visual({
  multiplayerAttackRef,
  stairStateRef,
  analogMovementRef,
  onSpinReadyChange,
  onLeftArmReadyChange,
}: Props) {
  const gltf = useGLTF(MODEL_URL);

  // A skinned character must be cloned with its skeleton.
  const scene = useMemo(
    () => cloneSkeleton(gltf.scene),
    [gltf.scene],
  );

  const { actions } = useAnimations(gltf.animations, scene);

  const keysRef = useRef(new Set<string>());
  const runningRef = useRef(false);
  const locomotionRef = useRef<MovementClip | null>(null);
  const attackRef = useRef<AttackClip | null>(null);
  const attackRemainingRef = useRef(0);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (MOVEMENT_KEYS.has(event.code)) {
        keysRef.current.add(event.code);
      }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        runningRef.current = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        runningRef.current = false;
      }
    };

    const onBlur = () => {
      keysRef.current.clear();
      runningRef.current = false;
    };

    const onAttack = (event: Event) => {
      const kind = (event as CustomEvent<string>).detail;

      if (attackRef.current || attackRemainingRef.current > 0) {
        return;
      }

      const clip: AttackClip | null =
        kind === "punch"
          ? "BOBU_Punch"
          : kind === "spin"
            ? "BOBU_SpinAttack"
            : null;

      if (!clip) return;

      const action = actions[clip];
      if (!action) {
        console.warn("BOBU V2 animation missing:", clip);
        return;
      }

      if (locomotionRef.current) {
        actions[locomotionRef.current]?.fadeOut(0.12);
        locomotionRef.current = null;
      }

      if (multiplayerAttackRef && (kind === "punch" || kind === "spin")) {
        multiplayerAttackRef.current = {
          id: crypto.randomUUID(),
          kind,
          expiresAt: Date.now() + 2200,
        };
      }

      attackRef.current = clip;
      attackRemainingRef.current = kind === "punch" ? 0.7 : 1.5;

      action
        .reset()
        .setLoop(THREE.LoopOnce, 1)
        .setEffectiveTimeScale(kind === "punch" ? 1.3 : 1)
        .setEffectiveWeight(1)
        .fadeIn(0.12)
        .play();

      action.clampWhenFinished = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("bobu:ares-attack", onAttack);

    onSpinReadyChange?.(Boolean(actions.BOBU_SpinAttack));
    onLeftArmReadyChange?.(Boolean(actions.BOBU_Punch));

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("bobu:ares-attack", onAttack);

      onSpinReadyChange?.(false);
      onLeftArmReadyChange?.(false);

      for (const action of Object.values(actions)) {
        action?.stop();
      }
    };
  }, [actions, onSpinReadyChange, onLeftArmReadyChange, multiplayerAttackRef]);

  useFrame((_state, delta) => {
    if (attackRef.current) {
      attackRemainingRef.current -= Math.min(delta, 0.1);

      if (attackRemainingRef.current > 0) return;

      const finished = attackRef.current;
      actions[finished]?.fadeOut(0.12);
      attackRef.current = null;
      attackRemainingRef.current = 0;
      locomotionRef.current = null;
    }

    const analog = analogMovementRef?.current;
    const analogMoving =
      Boolean(analog) &&
      Math.hypot(analog?.x ?? 0, analog?.y ?? 0) > 0.08;

    const moving = keysRef.current.size > 0 || analogMoving;

    const desired: MovementClip | null = !moving
      ? null
      : runningRef.current
        ? "BOBU_Run"
        : "BOBU_Walk";

    if (desired === locomotionRef.current) {
      return;
    }

    if (locomotionRef.current) {
      actions[locomotionRef.current]?.fadeOut(0.16);
    }

    if (desired) {
      const action = actions[desired];

      if (action) {
        action
          .reset()
          .setLoop(THREE.LoopRepeat, Infinity)
          .setEffectiveTimeScale(
            stairStateRef?.current ? 0.85 :
            desired === "BOBU_Run" ? 1.18 : 1,
          )
          .setEffectiveWeight(1)
          .fadeIn(0.16)
          .play();
      }
    }

    locomotionRef.current = desired;
  });

  return (
    <group scale={[0.82, 0.82, 0.82]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);

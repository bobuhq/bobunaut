import { markAresStage, startAresStage } from "../engine/aresPerformance";
import {
  useEffect,
  useRef,
} from "react";

import {
  useFrame,
  useThree,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  ARES_GENESIS_SAFE_BOUNDARY_METERS,
  loadAresGenesisTerrainData,
  sampleAresGenesisRenderedSurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

import {
  isAresCommandHubStairPosition,
  isInsideHubFloor,
  sampleAresCommandHubWalkableSurfaceMeters,
} from "../commandhub/AresCommandHubWalkableSurface";

import {
  createEmptyMarsMovementInput,
  getMarsFacingAngle,
  getMarsMovementDirection,
  getMarsMovementSpeed,
  type MarsMovementInput,
} from "../engine/MarsCharacterMovement";

export type MarsCollisionObstacle =
  | {
      kind?: "circle";
      x: number;
      z: number;
      radius: number;
    }
  | {
      kind: "box";
      x: number;
      z: number;
      halfWidth: number;
      halfDepth: number;
    };

export type MarsAnalogMovement = {
  x: number;
  y: number;
};

type BobuCharacterControllerProps = {
  children?: React.ReactNode;
  terrainData?: AresGenesisTerrainData;
  startPosition?: [
    number,
    number,
    number,
  ];
  boundary?: number;
  characterRef?: React.RefObject<THREE.Group | null>;
  collisionObstacles?: MarsCollisionObstacle[];
  walkableSurface?: (terrain: AresGenesisTerrainData, x: number, z: number) => number | null;
  stairStateRef?: React.MutableRefObject<boolean>;
  analogMovementRef?: React.MutableRefObject<MarsAnalogMovement>;
};

const KEY_TO_INPUT: Record<
  string,
  keyof Omit<MarsMovementInput, "run">
> = {
  KeyW: "forward",
  ArrowUp: "forward",

  KeyS: "backward",
  ArrowDown: "backward",

  KeyA: "left",
  ArrowLeft: "left",

  KeyD: "right",
  ArrowRight: "right",
};

const NO_COLLISION_OBSTACLES: MarsCollisionObstacle[] = [];
const BOBU_COLLISION_RADIUS = 0.48;
const COLLISION_QUERY_RADIUS = 4;
const FOOT_SAMPLE_RADIUS = 0.34;
const FOOT_SAMPLE_OFFSETS = [
  [0, 0],
  [0, FOOT_SAMPLE_RADIUS],
  [0, -FOOT_SAMPLE_RADIUS],
  [-FOOT_SAMPLE_RADIUS, 0],
  [FOOT_SAMPLE_RADIUS, 0],
] as const;

function isBlockedAt(obstacles: MarsCollisionObstacle[], x: number, z: number) {
  for (const obstacle of obstacles) {
    if (obstacle.kind === "box") {
      const dx = Math.max(0, Math.abs(x - obstacle.x) - obstacle.halfWidth);
      if (dx >= BOBU_COLLISION_RADIUS) continue;
      const dz = Math.max(0, Math.abs(z - obstacle.z) - obstacle.halfDepth);
      if (dx * dx + dz * dz < BOBU_COLLISION_RADIUS * BOBU_COLLISION_RADIUS) return true;
    } else {
      const dx = x - obstacle.x;
      const dz = z - obstacle.z;
      const minimumDistance = BOBU_COLLISION_RADIUS + obstacle.radius;
      if (dx * dx + dz * dz < minimumDistance * minimumDistance) return true;
    }
  }
  return false;
}

export function BobuCharacterController({
  children,
  terrainData,
  startPosition = [0, 0, 0],
  boundary =
    ARES_GENESIS_SAFE_BOUNDARY_METERS,
  characterRef,
  collisionObstacles = NO_COLLISION_OBSTACLES,
  walkableSurface,
  stairStateRef,
  analogMovementRef,
}: BobuCharacterControllerProps) {
  const internalGroupRef =
    useRef<THREE.Group | null>(null);

  const groupRef =
    characterRef ??
    internalGroupRef;

  const {
    camera,
  } = useThree();

  const inputRef =
    useRef<MarsMovementInput>(
      createEmptyMarsMovementInput(),
    );

  const startedFrame = useRef(false);

  const facingAngleRef =
    useRef(0);

  const inputDirectionRef = useRef(new THREE.Vector3());

  const movementDirectionRef =
    useRef(new THREE.Vector3());

  const cameraForwardRef =
    useRef(new THREE.Vector3());

  const cameraRightRef =
    useRef(new THREE.Vector3());

  const cameraRelativeDirectionRef =
    useRef(new THREE.Vector3());

  const terrainDataRef =
    useRef<AresGenesisTerrainData | null>(
      null,
    );

  const collisionQueryRef = useRef({
    obstacles: null as MarsCollisionObstacle[] | null,
    nearby: [] as MarsCollisionObstacle[],
    x: 0,
    z: 0,
  });

  const groundSampleRef = useRef({
    terrain: null as AresGenesisTerrainData | null,
    x: NaN,
    z: NaN,
    height: 0,
  });

  const verticalVelocityRef =
    useRef(0);

  const jumpOffsetRef =
    useRef(0);

  const groundedRef =
    useRef(true);

  const JUMP_VELOCITY = 2.9;
  const MARS_GRAVITY = 3.71;

  useEffect(() => {
    if (terrainData) return;
    let active = true;

    loadAresGenesisTerrainData()
      .then((terrain) => {
        if (active) {
          terrainDataRef.current =
            terrain;
        }
      })
      .catch((error) => {
        console.error(
          "Failed to initialize BOBU terrain sampling",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [terrainData]);

  useEffect(() => {
    const finishStartup = startAresStage("character-controller-input-startup");
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      const movementKey =
        KEY_TO_INPUT[event.code];

      if (movementKey) {
        inputRef.current[movementKey] =
          true;

        event.preventDefault();
      }

      if (
        event.code === "ShiftLeft" ||
        event.code === "ShiftRight"
      ) {
        inputRef.current.run = true;
      }

      if (
        event.code === "Space" &&
        groundedRef.current &&
        !event.repeat
      ) {
        groundedRef.current = false;
        verticalVelocityRef.current =
          JUMP_VELOCITY;

        event.preventDefault();
      }
    }

    function handleKeyUp(
      event: KeyboardEvent,
    ) {
      const movementKey =
        KEY_TO_INPUT[event.code];

      if (movementKey) {
        inputRef.current[movementKey] =
          false;

        event.preventDefault();
      }

      if (
        event.code === "ShiftLeft" ||
        event.code === "ShiftRight"
      ) {
        inputRef.current.run = false;
      }
    }

    function resetInput() {
      inputRef.current =
        createEmptyMarsMovementInput();
    }

    function handleVisibilityChange() {
      if (document.hidden) resetInput();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
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
      resetInput,
    );

    finishStartup?.();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
        resetInput,
      );
    };
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    // Recover normal frame-time movement without replaying long stalls.
    // Large pauses retain the original collision-safe displacement limit.
    const movementDelta =
      delta > 0.25 ? 0.05 : Math.min(delta, 0.15);
    delta = Math.min(delta, 0.05);

    if (!group) {
      return;
    }

    if (import.meta.env.DEV && !startedFrame.current) {
      startedFrame.current = true;
      markAresStage("character-controller-first-tick");
    }

    const input =
      inputRef.current;

    const direction =
      getMarsMovementDirection(
        input,
        inputDirectionRef.current,
      );

    const analogMovement =
      analogMovementRef?.current;

    if (
      analogMovement &&
      Math.hypot(
        analogMovement.x,
        analogMovement.y,
      ) > 0
    ) {
      direction.set(
        analogMovement.x,
        0,
        analogMovement.y,
      );

      if (direction.lengthSq() > 1) {
        direction.normalize();
      }
    }

    if (direction.lengthSq() > 0) {
      camera.getWorldDirection(
        cameraForwardRef.current,
      );

      cameraForwardRef.current.y = 0;

      if (
        cameraForwardRef.current.lengthSq() >
        0
      ) {
        cameraForwardRef.current.normalize();
      }

      cameraRightRef.current
        .crossVectors(
          cameraForwardRef.current,
          camera.up,
        )
        .normalize();

      cameraRelativeDirectionRef.current
        .set(0, 0, 0)
        .addScaledVector(
          cameraForwardRef.current,
          -direction.z,
        )
        .addScaledVector(
          cameraRightRef.current,
          direction.x,
        );

      if (
        cameraRelativeDirectionRef.current.lengthSq() >
        0
      ) {
        cameraRelativeDirectionRef.current.normalize();
      }

      movementDirectionRef.current.copy(
        cameraRelativeDirectionRef.current,
      );
    } else {
      movementDirectionRef.current.set(
        0,
        0,
        0,
      );
    }

    if (
      movementDirectionRef.current.lengthSq() >
      0
    ) {
      const speed =
        getMarsMovementSpeed(
          input,
        );

      const nextX =
        THREE.MathUtils.clamp(
          group.position.x +
            movementDirectionRef.current.x *
              speed *
              movementDelta,
          -boundary,
          boundary,
        );

      const nextZ =
        THREE.MathUtils.clamp(
          group.position.z +
            movementDirectionRef.current.z *
              speed *
              movementDelta,
          -boundary,
          boundary,
        );

      const movementX =
        nextX -
        group.position.x;

      const movementZ =
        nextZ -
        group.position.z;

      const movementDistance =
        Math.sqrt(
          movementX *
            movementX +
          movementZ *
            movementZ,
        );

      const query = collisionQueryRef.current;
      if (
        query.obstacles !== collisionObstacles ||
        Math.abs(group.position.x - query.x) > COLLISION_QUERY_RADIUS ||
        Math.abs(group.position.z - query.z) > COLLISION_QUERY_RADIUS ||
        Math.abs(nextX - query.x) > COLLISION_QUERY_RADIUS ||
        Math.abs(nextZ - query.z) > COLLISION_QUERY_RADIUS
      ) {
        query.obstacles = collisionObstacles;
        query.x = group.position.x;
        query.z = group.position.z;
        query.nearby.length = 0;
        // Include every obstacle whose expanded footprint can touch a sweep
        // within this square. Substeps still use the exact circle/box tests.
        const reach = COLLISION_QUERY_RADIUS + BOBU_COLLISION_RADIUS;
        for (const obstacle of collisionObstacles) {
          const extentX = obstacle.kind === "box" ? obstacle.halfWidth : obstacle.radius;
          const extentZ = obstacle.kind === "box" ? obstacle.halfDepth : obstacle.radius;
          if (
            Math.abs(obstacle.x - query.x) <= reach + extentX &&
            Math.abs(obstacle.z - query.z) <= reach + extentZ
          ) {
            query.nearby.push(obstacle);
          }
        }
      }

      const maxCollisionStep =
        0.18;

      const collisionSteps =
        Math.max(
          1,
          Math.ceil(
            movementDistance /
              maxCollisionStep,
          ),
        );

      let safeX =
        group.position.x;

      let safeZ =
        group.position.z;

      for (
        let step = 1;
        step <= collisionSteps;
        step += 1
      ) {
        const ratio =
          step /
          collisionSteps;

        const candidateX =
          group.position.x +
          movementX *
            ratio;

        const candidateZ =
          group.position.z +
          movementZ *
            ratio;

        if (
          isBlockedAt(
            query.nearby,
            candidateX,
            candidateZ,
          )
        ) {
          break;
        }

        safeX =
          candidateX;

        safeZ =
          candidateZ;
      }

      group.position.x =
        safeX;

      group.position.z =
        safeZ;
    }

    if (stairStateRef) {
      stairStateRef.current =
        isAresCommandHubStairPosition(
          group.position.x,
          group.position.z,
        );
    }

    const terrain =
      terrainData ?? terrainDataRef.current;

    if (terrain) {
      const { x, z } = group.position;
      const sample = groundSampleRef.current;
      if (sample.terrain !== terrain || sample.x !== x || sample.z !== z) {
        // The built floor supports the character even where the outdoor
        // heightfield would otherwise raise it through the interior.
        const hubFloor = isInsideHubFloor(x, z)
          ? sampleAresCommandHubWalkableSurfaceMeters(terrain, x, z)
          : null;
        let height = hubFloor ?? -Infinity;
        if (hubFloor === null) {
          for (const [offsetX, offsetZ] of FOOT_SAMPLE_OFFSETS) {
            const sampleX = x + offsetX;
            const sampleZ = z + offsetZ;
            height = Math.max(height, sampleAresGenesisRenderedSurfaceMeters(terrain, sampleX, sampleZ));
            const hubGround = sampleAresCommandHubWalkableSurfaceMeters(terrain, sampleX, sampleZ);
            if (hubGround !== null) height = Math.max(height, hubGround);
          }
        }
        sample.terrain = terrain;
        sample.x = x;
        sample.z = z;
        sample.height = height;
      }

      let ground = sample.height;
      const campusGround = walkableSurface?.(terrain, x, z);
      if (typeof campusGround === "number" && Number.isFinite(campusGround)) {
        ground = Math.max(ground, campusGround);
      }
      const groundHeight = ground + 0.09;

      if (!groundedRef.current) {
        verticalVelocityRef.current -=
          MARS_GRAVITY * delta;

        jumpOffsetRef.current +=
          verticalVelocityRef.current *
          delta;

        if (
          jumpOffsetRef.current <= 0 &&
          verticalVelocityRef.current < 0
        ) {
          jumpOffsetRef.current = 0;
          verticalVelocityRef.current = 0;
          groundedRef.current = true;
        }
      }

      group.position.y =
        groundHeight +
        jumpOffsetRef.current;
    }

    camera.getWorldDirection(
      cameraForwardRef.current,
    );

    cameraForwardRef.current.y = 0;

    if (
      cameraForwardRef.current.lengthSq() ===
      0
    ) {
      return;
    }

    cameraForwardRef.current.normalize();

    const targetAngle =
      getMarsFacingAngle(
        cameraForwardRef.current,
        facingAngleRef.current,
      );

    const shortestTurn = Math.atan2(
      Math.sin(targetAngle - facingAngleRef.current),
      Math.cos(targetAngle - facingAngleRef.current),
    );

    facingAngleRef.current +=
      shortestTurn * Math.min(1, delta * 12);

    group.rotation.y =
      facingAngleRef.current;
  });

  return (
    <group
      ref={groupRef}
      position={startPosition}
    >
      {children}
    </group>
  );
}

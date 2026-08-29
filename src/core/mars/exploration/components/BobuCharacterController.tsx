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
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

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

type BobuCharacterControllerProps = {
  children?: React.ReactNode;
  startPosition?: [
    number,
    number,
    number,
  ];
  boundary?: number;
  characterRef?: React.RefObject<THREE.Group | null>;
  collisionObstacles?: MarsCollisionObstacle[];
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

export function BobuCharacterController({
  children,
  startPosition = [0, 0, 0],
  boundary =
    ARES_GENESIS_SAFE_BOUNDARY_METERS,
  characterRef,
  collisionObstacles = [],
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

  const facingAngleRef =
    useRef(0);

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

  const verticalVelocityRef =
    useRef(0);

  const jumpOffsetRef =
    useRef(0);

  const groundedRef =
    useRef(true);

  const JUMP_VELOCITY = 4.8;
  const MARS_GRAVITY = 3.71;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
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
        resetInput,
      );
    };
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const input =
      inputRef.current;

    const direction =
      getMarsMovementDirection(
        input,
      );

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
              delta,
          -boundary,
          boundary,
        );

      const nextZ =
        THREE.MathUtils.clamp(
          group.position.z +
            movementDirectionRef.current.z *
              speed *
              delta,
          -boundary,
          boundary,
        );

      const BOBU_COLLISION_RADIUS =
        0.48;

      const blocked =
        collisionObstacles.some(
          (obstacle) => {
            if (
              obstacle.kind ===
              "box"
            ) {
              const minX =
                obstacle.x -
                obstacle.halfWidth;

              const maxX =
                obstacle.x +
                obstacle.halfWidth;

              const minZ =
                obstacle.z -
                obstacle.halfDepth;

              const maxZ =
                obstacle.z +
                obstacle.halfDepth;

              const closestX =
                THREE.MathUtils.clamp(
                  nextX,
                  minX,
                  maxX,
                );

              const closestZ =
                THREE.MathUtils.clamp(
                  nextZ,
                  minZ,
                  maxZ,
                );

              const dx =
                nextX -
                closestX;

              const dz =
                nextZ -
                closestZ;

              return (
                dx * dx +
                  dz * dz <
                BOBU_COLLISION_RADIUS *
                  BOBU_COLLISION_RADIUS
              );
            }

            if (
              !("radius" in obstacle)
            ) {
              return false;
            }

            const dx =
              nextX -
              obstacle.x;

            const dz =
              nextZ -
              obstacle.z;

            const minimumDistance =
              BOBU_COLLISION_RADIUS +
              obstacle.radius;

            return (
              dx * dx +
                dz * dz <
              minimumDistance *
                minimumDistance
            );
          },
        );

      if (!blocked) {
        group.position.x =
          nextX;

        group.position.z =
          nextZ;
      }
    }

    const terrain =
      terrainDataRef.current;

    if (terrain) {
      const groundHeight =
        sampleAresGenesisGameplaySurfaceMeters(
          terrain,
          group.position.x,
          group.position.z,
        );

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

    facingAngleRef.current =
      THREE.MathUtils.lerp(
        facingAngleRef.current,
        targetAngle,
        Math.min(
          1,
          delta * 12,
        ),
      );

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

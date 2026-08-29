import * as THREE from "three";

export type MarsMovementInput = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
};

export type MarsMovementConfig = {
  walkSpeed: number;
  runSpeed: number;
};

export const DEFAULT_MARS_MOVEMENT_CONFIG: MarsMovementConfig = {
  walkSpeed: 3.2,
  runSpeed: 5.4,
};

export function createEmptyMarsMovementInput(): MarsMovementInput {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
  };
}

export function getMarsMovementDirection(
  input: MarsMovementInput,
): THREE.Vector3 {
  const direction = new THREE.Vector3();

  if (input.forward) {
    direction.z -= 1;
  }

  if (input.backward) {
    direction.z += 1;
  }

  if (input.left) {
    direction.x -= 1;
  }

  if (input.right) {
    direction.x += 1;
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
  }

  return direction;
}

export function getMarsMovementSpeed(
  input: MarsMovementInput,
  config: MarsMovementConfig = DEFAULT_MARS_MOVEMENT_CONFIG,
): number {
  return input.run
    ? config.runSpeed
    : config.walkSpeed;
}

export function isMarsCharacterMoving(
  input: MarsMovementInput,
): boolean {
  return (
    input.forward ||
    input.backward ||
    input.left ||
    input.right
  );
}

export function getMarsFacingAngle(
  direction: THREE.Vector3,
  fallbackAngle = 0,
): number {
  if (direction.lengthSq() === 0) {
    return fallbackAngle;
  }

  return Math.atan2(
    direction.x,
    direction.z,
  );
}

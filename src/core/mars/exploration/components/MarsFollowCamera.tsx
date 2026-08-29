import {
  useRef,
} from "react";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

type MarsFollowCameraProps = {
  targetRef: React.RefObject<THREE.Group | null>;
};

const CAMERA_DISTANCE = 9;
const CAMERA_HEIGHT = 4.8;
const LOOK_HEIGHT = 1.15;

export function MarsFollowCamera({
  targetRef,
}: MarsFollowCameraProps) {
  const desiredPosition =
    useRef(new THREE.Vector3());

  const lookTarget =
    useRef(new THREE.Vector3());

  const localOffset =
    useRef(
      new THREE.Vector3(
        0,
        CAMERA_HEIGHT,
        -CAMERA_DISTANCE,
      ),
    );

  useFrame(
    ({ camera }, delta) => {
      const target =
        targetRef.current;

      if (!target) {
        return;
      }

      const worldPosition =
        target.getWorldPosition(
          new THREE.Vector3(),
        );

      const worldQuaternion =
        target.getWorldQuaternion(
          new THREE.Quaternion(),
        );

      desiredPosition.current
        .copy(localOffset.current)
        .applyQuaternion(
          worldQuaternion,
        )
        .add(worldPosition);

      const followStrength =
        1 -
        Math.exp(
          -5.5 * delta,
        );

      camera.position.lerp(
        desiredPosition.current,
        followStrength,
      );

      lookTarget.current.set(
        worldPosition.x,
        worldPosition.y +
          LOOK_HEIGHT,
        worldPosition.z,
      );

      camera.lookAt(
        lookTarget.current,
      );
    },
  );

  return null;
}

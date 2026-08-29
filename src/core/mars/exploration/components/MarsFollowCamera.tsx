import {
  useEffect,
  useRef,
} from "react";

import {
  useFrame,
  useThree,
} from "@react-three/fiber";

import * as THREE from "three";

type MarsFollowCameraProps = {
  targetRef: React.RefObject<THREE.Group | null>;
};

const CAMERA_HORIZONTAL_DISTANCE = 9;
const CAMERA_HEIGHT = 4.8;
const LOOK_HEIGHT = 1.15;

const CAMERA_RADIUS =
  Math.sqrt(
    CAMERA_HORIZONTAL_DISTANCE *
      CAMERA_HORIZONTAL_DISTANCE +
      CAMERA_HEIGHT *
        CAMERA_HEIGHT,
  );

const INITIAL_PITCH =
  Math.atan2(
    CAMERA_HEIGHT,
    CAMERA_HORIZONTAL_DISTANCE,
  );

const MIN_PITCH =
  THREE.MathUtils.degToRad(8);

const MAX_PITCH =
  THREE.MathUtils.degToRad(68);

const MOUSE_SENSITIVITY = 0.004;

export function MarsFollowCamera({
  targetRef,
}: MarsFollowCameraProps) {
  const {
    gl,
  } = useThree();

  const desiredPosition =
    useRef(new THREE.Vector3());

  const lookTarget =
    useRef(new THREE.Vector3());

  const worldPosition =
    useRef(new THREE.Vector3());

  const orbitOffset =
    useRef(new THREE.Vector3());

  const orbitYaw =
    useRef(0);

  const orbitPitch =
    useRef(INITIAL_PITCH);

  const dragging =
    useRef(false);

  useEffect(() => {
    const element =
      gl.domElement;

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (event.button !== 0) {
        return;
      }

      dragging.current = true;

      element.setPointerCapture?.(
        event.pointerId,
      );

      element.style.cursor =
        "grabbing";
    }

    function handlePointerMove(
      event: PointerEvent,
    ) {
      if (!dragging.current) {
        return;
      }

      orbitYaw.current -=
        event.movementX *
        MOUSE_SENSITIVITY;

      orbitPitch.current =
        THREE.MathUtils.clamp(
          orbitPitch.current -
            event.movementY *
              MOUSE_SENSITIVITY,
          MIN_PITCH,
          MAX_PITCH,
        );
    }

    function stopDragging(
      event?: PointerEvent,
    ) {
      dragging.current = false;

      if (
        event &&
        element.hasPointerCapture?.(
          event.pointerId,
        )
      ) {
        element.releasePointerCapture?.(
          event.pointerId,
        );
      }

      element.style.cursor =
        "grab";
    }

    function handleWindowBlur() {
      stopDragging();
    }

    element.style.cursor =
      "grab";

    element.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    element.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    element.addEventListener(
      "pointerup",
      stopDragging,
    );

    element.addEventListener(
      "pointercancel",
      stopDragging,
    );

    window.addEventListener(
      "blur",
      handleWindowBlur,
    );

    return () => {
      element.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      element.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      element.removeEventListener(
        "pointerup",
        stopDragging,
      );

      element.removeEventListener(
        "pointercancel",
        stopDragging,
      );

      window.removeEventListener(
        "blur",
        handleWindowBlur,
      );

      element.style.cursor = "";
    };
  }, [
    gl,
  ]);

  useFrame(
    ({ camera }, delta) => {
      const target =
        targetRef.current;

      if (!target) {
        return;
      }

      target.getWorldPosition(
        worldPosition.current,
      );

      const pitch =
        orbitPitch.current;

      const yaw =
        orbitYaw.current;

      const horizontalRadius =
        Math.cos(pitch) *
        CAMERA_RADIUS;

      orbitOffset.current.set(
        Math.sin(yaw) *
          horizontalRadius,
        Math.sin(pitch) *
          CAMERA_RADIUS,
        -Math.cos(yaw) *
          horizontalRadius,
      );

      desiredPosition.current
        .copy(
          worldPosition.current,
        )
        .add(
          orbitOffset.current,
        );

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
        worldPosition.current.x,
        worldPosition.current.y +
          LOOK_HEIGHT,
        worldPosition.current.z,
      );

      camera.lookAt(
        lookTarget.current,
      );
    },
  );

  return null;
}

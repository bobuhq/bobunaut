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
  ARES_COMMAND_HUB_DEPTH,
  ARES_COMMAND_HUB_POSITION,
  ARES_COMMAND_HUB_WIDTH,
} from "../commandhub/AresCommandHubCollision";

type MarsFollowCameraProps = {
  targetRef: React.RefObject<THREE.Group | null>;
};

const OUTDOOR_CAMERA_HORIZONTAL_DISTANCE = 6.5;
const OUTDOOR_CAMERA_HEIGHT = 3.6;

const INDOOR_CAMERA_HORIZONTAL_DISTANCE = 3.2;
const INDOOR_CAMERA_HEIGHT = 2.25;

const LOOK_HEIGHT = 1.15;

const OUTDOOR_CAMERA_RADIUS =
  Math.sqrt(
    OUTDOOR_CAMERA_HORIZONTAL_DISTANCE *
      OUTDOOR_CAMERA_HORIZONTAL_DISTANCE +
      OUTDOOR_CAMERA_HEIGHT *
        OUTDOOR_CAMERA_HEIGHT,
  );

const INDOOR_CAMERA_RADIUS =
  Math.sqrt(
    INDOOR_CAMERA_HORIZONTAL_DISTANCE *
      INDOOR_CAMERA_HORIZONTAL_DISTANCE +
      INDOOR_CAMERA_HEIGHT *
        INDOOR_CAMERA_HEIGHT,
  );

const INITIAL_PITCH =
  Math.atan2(
    OUTDOOR_CAMERA_HEIGHT,
    OUTDOOR_CAMERA_HORIZONTAL_DISTANCE,
  );

function isInsideAresCommandHub(
  position: THREE.Vector3,
): boolean {
  const dx =
    position.x -
    ARES_COMMAND_HUB_POSITION.x;

  const dz =
    position.z -
    ARES_COMMAND_HUB_POSITION.z;

  return (
    Math.abs(dx) <
      ARES_COMMAND_HUB_WIDTH / 2 -
        0.45 &&
    Math.abs(dz) <
      ARES_COMMAND_HUB_DEPTH / 2 -
        0.45
  );
}

const MIN_PITCH =
  THREE.MathUtils.degToRad(8);

const MAX_PITCH =
  THREE.MathUtils.degToRad(68);

const MOUSE_SENSITIVITY = 0.004;

const OUTDOOR_CAMERA_FOV = 54;
const INDOOR_CAMERA_FOV = 48;

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

  const touchPointerX =
    useRef<number | null>(null);

  useEffect(() => {
    const element =
      gl.domElement;

    function isMobileTouchInput(
      event: PointerEvent,
    ) {
      return (
        event.pointerType === "touch" ||
        window.matchMedia(
          "(pointer: coarse)",
        ).matches
      );
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (event.button !== 0) {
        return;
      }

      dragging.current = true;

      if (isMobileTouchInput(event)) {
        touchPointerX.current =
          event.clientX;
      }

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

      if (isMobileTouchInput(event)) {
        const previousX =
          touchPointerX.current ??
          event.clientX;

        const deltaX =
          event.clientX -
          previousX;

        touchPointerX.current =
          event.clientX;

        orbitYaw.current -=
          deltaX * 0.008;

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
      touchPointerX.current = null;

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

      const mobileLandscape =
        window.matchMedia(
          "(pointer: coarse) and (orientation: landscape)",
        ).matches;

      const pitch =
        mobileLandscape
          ? INITIAL_PITCH
          : orbitPitch.current;

      const yaw =
        orbitYaw.current;

      const insideCommandHub =
        isInsideAresCommandHub(
          worldPosition.current,
        );

      const cameraRadius =
        insideCommandHub
          ? INDOOR_CAMERA_RADIUS
          : OUTDOOR_CAMERA_RADIUS;

      const horizontalRadius =
        Math.cos(pitch) *
        cameraRadius;

      orbitOffset.current.set(
        Math.sin(yaw) *
          horizontalRadius,
        Math.sin(pitch) *
          cameraRadius,
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
          -(insideCommandHub
            ? 10
            : 5.5) *
            delta,
        );

      if (
        camera instanceof
        THREE.PerspectiveCamera
      ) {
        const targetFov =
          insideCommandHub
            ? INDOOR_CAMERA_FOV
            : OUTDOOR_CAMERA_FOV;

        camera.fov =
          THREE.MathUtils.lerp(
            camera.fov,
            targetFov,
            1 -
              Math.exp(
                -8 * delta,
              ),
          );

        camera.near =
          insideCommandHub
            ? 0.05
            : 0.1;

        camera.updateProjectionMatrix();
      }

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

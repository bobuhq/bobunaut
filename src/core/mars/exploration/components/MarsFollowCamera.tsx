import {MarsCameraClearance,followCameraRadius} from './MarsCameraClearance';
import type {CameraEnvironment} from '../separate-v11/campus-experience';
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
  mobileWalking?: boolean;
  environmentAt?: (x:number,z:number)=>CameraEnvironment|null;
  interiorAt?: (x: number, z: number) => boolean;
  constrainCamera?: (look: THREE.Vector3, eye: THREE.Vector3) => void;
};

const OUTDOOR_CAMERA_HORIZONTAL_DISTANCE = 4.9;
const OUTDOOR_CAMERA_HEIGHT = 3.0;

const INDOOR_CAMERA_HORIZONTAL_DISTANCE = 4.0;
const INDOOR_CAMERA_HEIGHT = 2.5;

const LOOK_HEIGHT = 1.15;

const OUTDOOR_CAMERA_RADIUS =
  Math.sqrt(
    OUTDOOR_CAMERA_HORIZONTAL_DISTANCE *
      OUTDOOR_CAMERA_HORIZONTAL_DISTANCE +
      OUTDOOR_CAMERA_HEIGHT *
        OUTDOOR_CAMERA_HEIGHT,
  );

const MOBILE_OUTDOOR_CAMERA_RADIUS = OUTDOOR_CAMERA_RADIUS * 0.85;

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

export function isInsideAresCommandHub(
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
  mobileWalking = false,
  interiorAt,
  environmentAt,
  constrainCamera,
}: MarsFollowCameraProps) {
  const {
    gl,scene,
  } = useThree();

  const clearance=useRef(new MarsCameraClearance());
  const clearanceRefresh=useRef(-Infinity);
  const projectedCamera=useRef({fov:NaN,near:NaN});
  const outdoorRadius = mobileWalking ? MOBILE_OUTDOOR_CAMERA_RADIUS : OUTDOOR_CAMERA_RADIUS;
  const followRadius=useRef(outdoorRadius);
  const cameraDistance=useRef(outdoorRadius);

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
  const touchPointerY = useRef<number | null>(null);

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
        touchPointerY.current = event.clientY;
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

        const previousY = touchPointerY.current ?? event.clientY;
        const deltaY = event.clientY - previousY;
        touchPointerY.current = event.clientY;
        orbitPitch.current = THREE.MathUtils.clamp(
          orbitPitch.current - deltaY * 0.006,
          MIN_PITCH,
          MAX_PITCH
        );

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
      touchPointerY.current = null;

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

    function handleCameraPitch(event: Event) {
      const delta = (event as CustomEvent<number>).detail;
      if (!Number.isFinite(delta)) return;
      orbitPitch.current = THREE.MathUtils.clamp(
        orbitPitch.current + delta,
        MIN_PITCH,
        MAX_PITCH
      );
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

    window.addEventListener(
      "bobu:ares-camera-pitch", handleCameraPitch
    );

    return () => {
      window.removeEventListener(
        "bobu:ares-camera-pitch", handleCameraPitch
      );
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
    ({ camera,clock }, delta) => {
      const target =
        targetRef.current;

      if (!target) {
        return;
      }

      target.getWorldPosition(
        worldPosition.current,
      );

      const pitch = orbitPitch.current;

      const yaw =
        orbitYaw.current;

      const insideCommandHub =
        isInsideAresCommandHub(
          worldPosition.current,
        ) || interiorAt?.(worldPosition.current.x, worldPosition.current.z) === true;

      const environment=environmentAt?.(worldPosition.current.x,worldPosition.current.z)??null;
      const targetRadius=environment?.narrow?3.6:insideCommandHub?INDOOR_CAMERA_RADIUS:outdoorRadius;
      followRadius.current=followCameraRadius(followRadius.current,targetRadius,delta);
      const cameraRadius=followRadius.current;

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
        const targetFov=environment?.narrow?(cameraDistance.current<2.2?70:60):insideCommandHub?INDOOR_CAMERA_FOV:OUTDOOR_CAMERA_FOV;

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

        // Compare against the last *projected* values, not last-frame
        // values; otherwise small FOV steps may never reach the renderer.
        if (
          Math.abs(camera.fov - projectedCamera.current.fov) > 0.025 ||
          camera.near !== projectedCamera.current.near
        ) {
          camera.updateProjectionMatrix();
          projectedCamera.current.fov = camera.fov;
          projectedCamera.current.near = camera.near;
        }
      }

      lookTarget.current.set(worldPosition.current.x,worldPosition.current.y+LOOK_HEIGHT,worldPosition.current.z);
      if(environment)lookTarget.current.y=THREE.MathUtils.clamp(lookTarget.current.y,environment.floor+.7,environment.ceiling-.65);
      if(environmentAt){
        if(clock.elapsedTime-clearanceRefresh.current>.4){
          clearanceRefresh.current=clock.elapsedTime;
          clearance.current.refresh(['campus-original-hub-rear-aperture','v11-independent-buildings-no-common-platform','persistent-player-owned-colony-buildings'].map(name=>scene.getObjectByName(name)).filter((o):o is THREE.Object3D=>Boolean(o)));
        }
        clearance.current.solve(lookTarget.current,desiredPosition.current,environment);
      }
      camera.position.lerp(
        desiredPosition.current,
        followStrength,
      );

      constrainCamera?.(lookTarget.current, camera.position);
      // Recheck the interpolated eye: interpolation alone can cut a U corner.
      if(environmentAt)cameraDistance.current=clearance.current.solve(lookTarget.current,camera.position,environment);
      else cameraDistance.current=camera.position.distanceTo(lookTarget.current);
      camera.lookAt(
        lookTarget.current,
      );
    },
  );

  return null;
}

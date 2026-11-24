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
  initialOrbitYaw?: number;
  initialOrbitPitch?: number;
  checkpointCameraRef?: React.MutableRefObject<{
    yaw: number;
    pitch: number;
  }>;
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
  initialOrbitYaw = 0,
  initialOrbitPitch = INITIAL_PITCH,
  checkpointCameraRef,
  mobileWalking = false,
  interiorAt,
  environmentAt,
  constrainCamera,
}: MarsFollowCameraProps) {
  const {
    gl,scene,
  } = useThree();

  const clearance=useRef(new MarsCameraClearance());
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
    useRef(
      Number.isFinite(initialOrbitYaw)
        ? initialOrbitYaw
        : 0
    );

  const orbitPitch =
    useRef(
      Number.isFinite(initialOrbitPitch)
        ? THREE.MathUtils.clamp(
            initialOrbitPitch,
            MIN_PITCH,
            MAX_PITCH
          )
        : INITIAL_PITCH
    );

  useEffect(() => {
    const element = gl.domElement;
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    let activePointer: number | null = null;
    let previousX = 0;
    let previousY = 0;

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0 || activePointer !== null) return;

      element.setPointerCapture?.(event.pointerId);
      activePointer = event.pointerId;
      previousX = event.clientX;
      previousY = event.clientY;
      element.style.cursor = "grabbing";
    }

    function stopDragging(event?: PointerEvent) {
      if (activePointer === null || (event && event.pointerId !== activePointer)) return;

      const pointerId = activePointer;
      activePointer = null;
      if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
      element.style.cursor = "grab";
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activePointer) return;
      const touch = event.pointerType === "touch" || coarsePointer.matches;
      if (event.pointerType === "mouse" && !(event.buttons & 1)) {
        stopDragging(event);
        return;
      }

      const locked = document.pointerLockElement === element;
      const deltaX = locked ? event.movementX : event.clientX - previousX;
      const deltaY = locked ? event.movementY : event.clientY - previousY;
      previousX = event.clientX;
      previousY = event.clientY;

      orbitYaw.current -= deltaX * (touch ? 0.008 : MOUSE_SENSITIVITY);
      orbitPitch.current = THREE.MathUtils.clamp(
        orbitPitch.current - deltaY * (touch ? 0.006 : MOUSE_SENSITIVITY),
        MIN_PITCH,
        MAX_PITCH,
      );
    }

    function handleWindowBlur() {
      stopDragging();
    }

    function handleVisibilityChange() {
      if (document.hidden) stopDragging();
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

    element.style.cursor = "grab";
    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", stopDragging);
    element.addEventListener("pointercancel", stopDragging);
    element.addEventListener("lostpointercapture", stopDragging);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("bobu:ares-camera-pitch", handleCameraPitch);

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", stopDragging);
      element.removeEventListener("pointercancel", stopDragging);
      element.removeEventListener("lostpointercapture", stopDragging);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("bobu:ares-camera-pitch", handleCameraPitch);
      stopDragging();
      element.style.cursor = "";
    };
  }, [
    gl,
  ]);

  useEffect(() => {
    if (!environmentAt) return;

    const rootNames = [
      "campus-original-hub-rear-aperture",
      "v11-independent-buildings-no-common-platform",
      "persistent-player-owned-colony-buildings",
    ];
    const refreshClearance = () => {
      if (document.hidden) return;
      const roots = rootNames.map(name => scene.getObjectByName(name))
        .filter((object): object is THREE.Object3D => object !== undefined);
      clearance.current.refresh(roots);
    };
    refreshClearance();
    const interval = window.setInterval(refreshClearance, 400);
    return () => window.clearInterval(interval);
  }, [environmentAt, scene]);

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

      delta = Math.min(delta, 0.05);
      const pitch = orbitPitch.current;

      const yaw =
        orbitYaw.current;

      if (checkpointCameraRef) {
        checkpointCameraRef.current.yaw = yaw;
        checkpointCameraRef.current.pitch = pitch;
      }

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
      if (environmentAt) {
        clearance.current.solve(lookTarget.current, desiredPosition.current, environment);
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

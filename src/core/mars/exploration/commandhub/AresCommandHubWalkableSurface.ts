import * as THREE from "three";

import type {
  AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

import {
  sampleAresGenesisRenderedSurfaceMeters,
} from "../engine/AresGenesisTerrainData";

import {
  ARES_COMMAND_HUB_DEPTH,
  ARES_COMMAND_HUB_POSITION,
  ARES_COMMAND_HUB_WIDTH,
} from "./AresCommandHubCollision";

export const ARES_COMMAND_HUB_WORLD_Y_OFFSET =
  0.05;

export const ARES_COMMAND_HUB_FLOOR_LOCAL_Y =
  0.01;

export const ARES_COMMAND_HUB_ENTRY_PLATFORM_LOCAL_Y =
  0.09;

export const ARES_COMMAND_HUB_STAIR_WIDTH =
  3.6;

export const ARES_COMMAND_HUB_STAIR_DEPTH =
  1.8;

export const ARES_COMMAND_HUB_STAIR_COUNT =
  4;

export const ARES_COMMAND_HUB_FRONT_Z =
  ARES_COMMAND_HUB_POSITION.z +
  ARES_COMMAND_HUB_DEPTH / 2;

export function isAresCommandHubStairPosition(
  worldX: number,
  worldZ: number,
): boolean {
  return (
    Math.abs(
      worldX -
        ARES_COMMAND_HUB_POSITION.x,
    ) <=
      ARES_COMMAND_HUB_STAIR_WIDTH / 2 &&
    worldZ >=
      ARES_COMMAND_HUB_FRONT_Z &&
    worldZ <=
      ARES_COMMAND_HUB_FRONT_Z +
        ARES_COMMAND_HUB_STAIR_DEPTH
  );
}

export function getAresCommandHubBaseY(
  terrain: AresGenesisTerrainData,
): number {
  return (
    sampleAresGenesisRenderedSurfaceMeters(
      terrain,
      ARES_COMMAND_HUB_POSITION.x,
      ARES_COMMAND_HUB_POSITION.z,
    ) +
    ARES_COMMAND_HUB_WORLD_Y_OFFSET
  );
}

export function getAresCommandHubFloorY(
  terrain: AresGenesisTerrainData,
): number {
  return (
    getAresCommandHubBaseY(
      terrain,
    ) +
    ARES_COMMAND_HUB_FLOOR_LOCAL_Y
  );
}

function isInsideHubFloor(
  worldX: number,
  worldZ: number,
): boolean {
  const dx =
    worldX -
    ARES_COMMAND_HUB_POSITION.x;

  const dz =
    worldZ -
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

export function sampleAresCommandHubWalkableSurfaceMeters(
  terrain: AresGenesisTerrainData,
  worldX: number,
  worldZ: number,
): number | null {
  const baseY =
    getAresCommandHubBaseY(
      terrain,
    );

  if (
    isInsideHubFloor(
      worldX,
      worldZ,
    )
  ) {
    return (
      baseY +
      ARES_COMMAND_HUB_FLOOR_LOCAL_Y
    );
  }

  const halfWidth =
    ARES_COMMAND_HUB_STAIR_WIDTH / 2;

  if (
    Math.abs(
      worldX -
        ARES_COMMAND_HUB_POSITION.x,
    ) >
    halfWidth
  ) {
    return null;
  }

  const outerZ =
    ARES_COMMAND_HUB_FRONT_Z +
    ARES_COMMAND_HUB_STAIR_DEPTH;

  if (
    worldZ <
      ARES_COMMAND_HUB_FRONT_Z ||
    worldZ >
      outerZ
  ) {
    return null;
  }

  const progress =
    THREE.MathUtils.clamp(
      (
        outerZ -
        worldZ
      ) /
        ARES_COMMAND_HUB_STAIR_DEPTH,
      0,
      1,
    );

  const stepIndex =
    Math.min(
      ARES_COMMAND_HUB_STAIR_COUNT,
      Math.max(
        1,
        Math.ceil(
          progress *
            ARES_COMMAND_HUB_STAIR_COUNT,
        ),
      ),
    );

  const outerTerrainY =
    sampleAresGenesisRenderedSurfaceMeters(
      terrain,
      worldX,
      outerZ,
    );

  const targetY =
    baseY +
    ARES_COMMAND_HUB_ENTRY_PLATFORM_LOCAL_Y;

  return THREE.MathUtils.lerp(
    outerTerrainY,
    targetY,
    stepIndex /
      ARES_COMMAND_HUB_STAIR_COUNT,
  );
}

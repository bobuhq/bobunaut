import {
  ARES_COMMAND_HUB_POSITION,
} from "../commandhub/AresCommandHubCollision";

export const ARES_COLONY_GRID_UNIT_METERS = 4.5;

export const ARES_COMMAND_HUB_GRID_X = 0;
export const ARES_COMMAND_HUB_GRID_Z = 0;
export const ARES_COMMAND_HUB_GRID_WIDTH = 4;
export const ARES_COMMAND_HUB_GRID_DEPTH = 4;

function gridCenter(
  gridX: number,
  gridZ: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  return {
    x:
      (gridX + (footprintWidth - 1) / 2) *
      ARES_COLONY_GRID_UNIT_METERS,
    z:
      (gridZ + (footprintDepth - 1) / 2) *
      ARES_COLONY_GRID_UNIT_METERS,
  };
}

const commandHubGridCenter = gridCenter(
  ARES_COMMAND_HUB_GRID_X,
  ARES_COMMAND_HUB_GRID_Z,
  ARES_COMMAND_HUB_GRID_WIDTH,
  ARES_COMMAND_HUB_GRID_DEPTH,
);

const colonyAnchor = {
  x:
    ARES_COMMAND_HUB_POSITION.x -
    commandHubGridCenter.x,
  z:
    ARES_COMMAND_HUB_POSITION.z -
    commandHubGridCenter.z,
};

export function aresColonyGridToWorld(
  gridX: number,
  gridZ: number,
  footprintWidth: number,
  footprintDepth: number,
) {
  const center = gridCenter(
    gridX,
    gridZ,
    footprintWidth,
    footprintDepth,
  );

  return {
    x: colonyAnchor.x + center.x,
    z: colonyAnchor.z + center.z,
  };
}

export function aresWorldToColonyGridPoint(
  worldX: number,
  worldZ: number,
) {
  return {
    gridX:
      (worldX - colonyAnchor.x) /
      ARES_COLONY_GRID_UNIT_METERS,
    gridZ:
      (worldZ - colonyAnchor.z) /
      ARES_COLONY_GRID_UNIT_METERS,
  };
}

export function aresColonyFootprintMeters(
  footprintWidth: number,
  footprintDepth: number,
) {
  return {
    width:
      footprintWidth *
      ARES_COLONY_GRID_UNIT_METERS,
    depth:
      footprintDepth *
      ARES_COLONY_GRID_UNIT_METERS,
  };
}

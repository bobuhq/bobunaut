import type {
  MarsCollisionObstacle,
} from "../components/BobuCharacterController";

export const ARES_COMMAND_HUB_POSITION = {
  x: -44,
  z: -68,
} as const;

export const ARES_COMMAND_HUB_WIDTH = 16;
export const ARES_COMMAND_HUB_DEPTH = 18;

const WALL_THICKNESS = 0.55;
const DOOR_WIDTH = 4;

const halfWidth =
  ARES_COMMAND_HUB_WIDTH / 2;

const halfDepth =
  ARES_COMMAND_HUB_DEPTH / 2;

const frontSideWidth =
  (
    ARES_COMMAND_HUB_WIDTH -
    DOOR_WIDTH
  ) / 2;

export const ARES_COMMAND_HUB_COLLISION_OBSTACLES:
MarsCollisionObstacle[] = [
  {
    kind: "box",
    x:
      ARES_COMMAND_HUB_POSITION.x -
      halfWidth +
      WALL_THICKNESS / 2,
    z:
      ARES_COMMAND_HUB_POSITION.z,
    halfWidth:
      WALL_THICKNESS / 2,
    halfDepth,
  },

  {
    kind: "box",
    x:
      ARES_COMMAND_HUB_POSITION.x +
      halfWidth -
      WALL_THICKNESS / 2,
    z:
      ARES_COMMAND_HUB_POSITION.z,
    halfWidth:
      WALL_THICKNESS / 2,
    halfDepth,
  },

  {
    kind: "box",
    x:
      ARES_COMMAND_HUB_POSITION.x,
    z:
      ARES_COMMAND_HUB_POSITION.z -
      halfDepth +
      WALL_THICKNESS / 2,
    halfWidth,
    halfDepth:
      WALL_THICKNESS / 2,
  },

  {
    kind: "box",
    x:
      ARES_COMMAND_HUB_POSITION.x -
      DOOR_WIDTH / 2 -
      frontSideWidth / 2,
    z:
      ARES_COMMAND_HUB_POSITION.z +
      halfDepth -
      WALL_THICKNESS / 2,
    halfWidth:
      frontSideWidth / 2,
    halfDepth:
      WALL_THICKNESS / 2,
  },

  {
    kind: "box",
    x:
      ARES_COMMAND_HUB_POSITION.x +
      DOOR_WIDTH / 2 +
      frontSideWidth / 2,
    z:
      ARES_COMMAND_HUB_POSITION.z +
      halfDepth -
      WALL_THICKNESS / 2,
    halfWidth:
      frontSideWidth / 2,
    halfDepth:
      WALL_THICKNESS / 2,
  },


  // BOBU_COMMAND_HUB_INTERIOR_CONSOLE_COLLISION_V1
  // Central holographic table (visible base outer radius 1.72m).
  {
    kind: "circle",
    x: ARES_COMMAND_HUB_POSITION.x,
    z: ARES_COMMAND_HUB_POSITION.z + 0.55,
    radius: 1.72,
  },

  // Side consoles: 2.15m long x 0.75m deep, rotated 90 degrees.
  // The collision engine uses axis-aligned boxes in world X/Z.
  ...([-1, 1] as const).flatMap((side) =>
    [-4.6, 4.35].map((localZ) => ({
      kind: "box" as const,
      x: ARES_COMMAND_HUB_POSITION.x + side * 5.78,
      z: ARES_COMMAND_HUB_POSITION.z + localZ,
      halfWidth: 0.375,
      halfDepth: 1.075,
    })),
  ),


  // BOBU_COMMAND_HUB_TERMINAL_COLLISION_V2
  // World-space footprints from visible model geometry.
  // The character movement engine adds its existing 0.48m clearance.
  // Mission desk: 2.8m x 1.2m at local (0, -3.7).
  {
    kind: "box",
    x: ARES_COMMAND_HUB_POSITION.x,
    z: ARES_COMMAND_HUB_POSITION.z - 3.7,
    halfWidth: 1.4,
    halfDepth: 0.6,
  },

  // Research pedestal: scaled by 0.85; local (-3.45, 1.55).
  {
    kind: "box",
    x: ARES_COMMAND_HUB_POSITION.x - 3.45,
    z: ARES_COMMAND_HUB_POSITION.z + 1.55,
    halfWidth: 1.24,
    halfDepth: 0.71,
  },

  // Command Hub upgrade pedestal: local (6, 1.55).
  {
    kind: "box",
    x: ARES_COMMAND_HUB_POSITION.x + 6.0,
    z: ARES_COMMAND_HUB_POSITION.z + 1.55,
    halfWidth: 0.575,
    halfDepth: 0.36,
  },

  // Purple energy core support at local (-2.5, -1.4).
  {
    kind: "circle",
    x: ARES_COMMAND_HUB_POSITION.x - 2.5,
    z: ARES_COMMAND_HUB_POSITION.z - 1.4,
    radius: 0.48,
  },

];

import type {
  MarsCollisionObstacle,
} from "../components/BobuCharacterController";

export const ARES_COMMAND_HUB_POSITION = {
  x: -44,
  z: -68,
} as const;

export const ARES_COMMAND_HUB_WIDTH = 10.8;
export const ARES_COMMAND_HUB_DEPTH = 12.6;

const WALL_THICKNESS = 0.55;
const DOOR_WIDTH = 2.8;

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

  {
    kind: "box",
    x:
      ARES_COMMAND_HUB_POSITION.x,
    z:
      ARES_COMMAND_HUB_POSITION.z -
      3.7,
    halfWidth: 1.45,
    halfDepth: 0.7,
  },
];

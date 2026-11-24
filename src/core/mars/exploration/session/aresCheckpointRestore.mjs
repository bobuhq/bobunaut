import { validateAresCheckpoint } from "./aresCheckpoint.mjs";

const ACTOR_RADIUS = 0.65;

const finite = value =>
  typeof value === "number" && Number.isFinite(value);

function validObstacle(o) {
  if (!o || !finite(o.x) || !finite(o.z)) return false;

  if (o.kind === "box") {
    return finite(o.halfWidth) &&
      finite(o.halfDepth) &&
      o.halfWidth >= 0 &&
      o.halfDepth >= 0;
  }

  return (o.kind === "circle" || o.kind === undefined) &&
    finite(o.radius) &&
    o.radius >= 0;
}

function blockedAt(x, z, obstacles) {
  return obstacles.some(o => {
    if (o.kind === "box") {
      const dx = Math.max(
        0, Math.abs(x - o.x) - o.halfWidth
      );

      const dz = Math.max(
        0, Math.abs(z - o.z) - o.halfDepth
      );

      return Math.hypot(dx, dz) <= ACTOR_RADIUS;
    }

    return Math.hypot(x - o.x, z - o.z) <=
      o.radius + ACTOR_RADIUS;
  });
}

export function validateAresRestorePosition(
  value,
  owner,
  geometry
) {
  const checkpoint = validateAresCheckpoint(value, owner);

  if (!checkpoint) return null;

  if (
    !geometry ||
    geometry.ready !== true ||
    geometry.authorized !== true ||
    !finite(geometry.boundary) ||
    geometry.boundary <= 0 ||
    !Array.isArray(geometry.obstacles) ||
    !geometry.obstacles.every(validObstacle) ||
    typeof geometry.sampleGround !== "function"
  ) return null;

  const [x, savedY, z] = checkpoint.position;

  if (
    Math.abs(x) > geometry.boundary - ACTOR_RADIUS ||
    Math.abs(z) > geometry.boundary - ACTOR_RADIUS ||
    blockedAt(x, z, geometry.obstacles)
  ) return null;

  try {
    const ground = geometry.sampleGround(x, z);

    if (
      !finite(ground) ||
      Math.abs(ground + 0.09 - savedY) > 1.5
    ) return null;

    return {
      position: [x, ground + 0.09, z],
      yaw: Math.atan2(
        Math.sin(checkpoint.yaw),
        Math.cos(checkpoint.yaw)
      ),
      cameraYaw: Math.atan2(
        Math.sin(checkpoint.cameraYaw),
        Math.cos(checkpoint.cameraYaw)
      ),
      cameraPitch: checkpoint.cameraPitch
    };
  } catch {
    return null;
  }
}

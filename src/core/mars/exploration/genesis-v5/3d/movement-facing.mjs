/** BOBU GLB face is local +Z. Preserve backpedalling for S and S diagonals.
 * A/D turn into travel because the original asset has no strafe clips.
 */
export function movementFacingAngle(x, z, backward, fallback) {
  if (x * x + z * z === 0) return fallback;
  return Math.atan2(backward ? -x : x, backward ? -z : z);
}

/** Shortest-arc interpolation, including camera yaw crossing ±PI. */
export function approachFacingAngle(current, target, amount) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * amount;
}

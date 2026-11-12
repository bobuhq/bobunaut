/** Entry dwell is hysteresis; exits restore visibility on the first outdoor frame. */
export function updateInteriorMode(state, inside, preferFirst, delta) {
  state.elapsed = inside ? state.elapsed + Math.min(delta, .05) : 0;
  state.first = inside && preferFirst && state.elapsed >= .12;
  return state.first;
}
export function viewForward(yaw, pitch) {
  return [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
}
export function applyLocalVisibility(target, hidden, state) {
  if (hidden && state.original === null) { state.original = target.visible; target.visible = false; }
  else if (!hidden && state.original !== null) { target.visible = state.original; state.original = null; }
}

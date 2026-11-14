// Allocation-free state update for the isolated Genesis follow camera.
const damp = (a, b, rate, dt) => a + (b - a) * -Math.expm1(-rate * dt);
export function wheelZoom(current, delta, mode, pageHeight) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
  return Math.max(.5, Math.min(1.6, current * Math.exp(Math.max(-200, Math.min(200, pixels)) * .0015)));
}
export function advanceOrbit(state, yaw, pitch, zoom, indoor, dt) {
  // Unwrapped yaw retains continuous full revolutions; no ±PI discontinuity.
  state.yaw = damp(state.yaw, yaw, 28, dt);
  state.pitch = damp(state.pitch, pitch, 28, dt);
  state.zoom = damp(state.zoom, zoom, 16, dt);
  state.indoor = damp(state.indoor, Number(indoor), 10, dt);
}
export function orbitEye(player, aimHeight, yaw, pitch, radius, shoulder, outdoorWeight, out) {
  const horizontal = Math.cos(pitch) * radius;
  const lateral = shoulder * Math.cos(pitch) ** 2;
  out.x = player.x + Math.sin(yaw) * horizontal + Math.cos(yaw) * lateral;
  out.y = player.y + aimHeight + Math.sin(pitch) * radius - 1.15 * outdoorWeight;
  out.z = player.z - Math.cos(yaw) * horizontal + Math.sin(yaw) * lateral;
}

/** Deterministic obstruction search. The collision adapter must sweep the full segment.
 * Never accept a wall-clamped eye inside the conservative animated character volume.
 * Keeping the previous branch until obstructed avoids left/right distance chatter.
 */
export function solveShoulderCamera(player, yaw, bounds, constrain, state, out, shoulder = .55) {
  const aim = { x: player.x, y: player.y + bounds.height * .72, z: player.z };
  const safe = eye => Math.hypot(eye.x-player.x, eye.z-player.z) >= bounds.radius + .3 || eye.y >= player.y + bounds.height + .3;
  const branches = [state.branch ?? 0, ...[0, 1, -1, 2, -2, 3, -3, 4].filter(n => n !== (state.branch ?? 0))];
  for (const branch of branches) {
    const angle = yaw + branch * Math.PI / 4;
    for (const distance of [3.2, 2.4, 1.7]) {
      const eye = {x: player.x + Math.sin(angle)*distance + Math.cos(angle)*shoulder,
        y: player.y + bounds.height + .45,
        z: player.z - Math.cos(angle)*distance + Math.sin(angle)*shoulder};
      constrain(aim, eye);
      if (!safe(eye)) continue;
      state.branch = branch;
      Object.assign(out, eye);
      state.blocked = false;
      return aim;
    }
  }
  state.blocked = true;
  return null;
}
export function outsideCharacter(eye, player, bounds) {
  return Math.hypot(eye.x-player.x,eye.z-player.z) >= bounds.radius+.3 || eye.y >= player.y+bounds.height+.3;
}

/** Manual orbit: collision changes distance only, never the user's angles.
 * The shoulder offset fades at the pole so lookAt never crosses vertical.
 * Roof slabs remain solid: overhead viewing happens below the ceiling.
 */
export function solveInteriorOrbit(player, yaw, pitch, bounds, constrain, out, shoulder = .55, radius = 3.9) {
  const aim = { x: player.x, y: player.y + bounds.height * .72, z: player.z };
  const elevation = Math.max(.02, Math.min(Math.PI / 2 - .02, pitch));
  const horizontal = Math.cos(elevation) * radius;
  const lateral = shoulder * Math.cos(elevation) ** 2;
  out.x = aim.x + Math.sin(yaw) * horizontal + Math.cos(yaw) * lateral;
  out.y = aim.y + Math.sin(elevation) * radius;
  out.z = aim.z - Math.cos(yaw) * horizontal + Math.sin(yaw) * lateral;
  constrain(aim, out);
  return aim;
}

const point = p => Array.isArray(p) && p.length === 3 && p.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 6350);
export function validHandoff(value, obstacles, sample) {
  if (!value || !point(value.spawn) || !point(value.ship) || !Number.isFinite(value.yaw)) return false;
  const [x,y,z] = value.spawn;
  if (Math.hypot(x-value.ship[0], z-value.ship[2]) > 35) return false;
  const floor = sample(x,z);
  if (!Number.isFinite(floor) || Math.abs(y-floor) > 1.5) return false;
  return !obstacles.some(o => o.kind === 'box'
    ? Math.hypot(Math.max(0,Math.abs(x-o.x)-o.halfWidth),Math.max(0,Math.abs(z-o.z)-o.halfDepth)) <= .65
    : Math.hypot(x-o.x,z-o.z) <= o.radius+.65);
}

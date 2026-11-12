import { STRUCTURAL_COLLIDERS, FURNITURE_COLLIDERS } from './structural-collision.mjs';
import { GENESIS_LOCAL_DOORS } from './production-collision-adapter.mjs';

// Eight door masks share stable, read-only collision arrays across controllers and remounts.
// The sweep only reads them; no geometry or GPU resources are retained here.
const solidsByDoorMask = new Map();
export function cameraSolids(doors) {
  const mask = Number(doors.surface >= .5) | (Number(doors.hub >= .5) << 1) | (Number(doors.habitat >= .5) << 2);
  if (!solidsByDoorMask.has(mask)) solidsByDoorMask.set(mask, buildCameraSolids(doors));
  return solidsByDoorMask.get(mask);
}
function buildCameraSolids(doors) {
  return [...STRUCTURAL_COLLIDERS, ...FURNITURE_COLLIDERS,
    ...[-2.06,2.06].map(x=>({xMin:x-.11,xMax:x+.11,zMin:8.9,zMax:13.3,yMin:1.2,yMax:4.6})),
    ...GENESIS_LOCAL_DOORS.map(d => ({xMin:-d.halfWidth-.25,xMax:d.halfWidth+.25,zMin:d.z-.275,zMax:d.z+.275,yMin:4.24,yMax:4.6})),
    ...GENESIS_LOCAL_DOORS.filter(d => doors[d.id] < .5).map(d => ({xMin:-d.halfWidth,xMax:d.halfWidth,zMin:d.z-d.halfDepth,zMax:d.z+d.halfDepth,yMin:1.2,yMax:4.38})),
    ...[[-8.35,8.35,-9.35,9.35,5.5],[-2.125,2.125,-26.1,-8.9,4.42],[-7.3,7.3,-43.2,-25.8,5.5],[-2.17,2.17,9,13.3,4.42]].map(([xMin,xMax,zMin,zMax,yMin])=>({xMin,xMax,zMin,zMax,yMin,yMax:yMin+.5}))];
}

/** Sweep a padded camera point from the aim point, preserving portal continuity. */
export function constrainGenesisEye(look, eye, solids, padding = .18) {
  let first = 1;
  const dx=eye.x-look.x, dy=eye.y-look.y, dz=eye.z-look.z;
  const xMin=Math.min(look.x,eye.x)-padding, xMax=Math.max(look.x,eye.x)+padding;
  const yMin=Math.min(look.y,eye.y)-padding, yMax=Math.max(look.y,eye.y)+padding;
  const zMin=Math.min(look.z,eye.z)-padding, zMax=Math.max(look.z,eye.z)+padding;
  for (const b of solids) {
    // Most static solids cannot intersect this short segment. Reject before slab divisions.
    if (b.xMax<xMin || b.xMin>xMax || b.yMax<yMin || b.yMin>yMax || b.zMax<zMin || b.zMin>zMax) continue;
    let near=0, far=1;
    const lx=b.xMin-padding, hx=b.xMax+padding;
    if (Math.abs(dx)<1e-9) { if(look.x<lx || look.x>hx) continue; }
    else { const a=(lx-look.x)/dx, c=(hx-look.x)/dx; near=Math.max(near,Math.min(a,c)); far=Math.min(far,Math.max(a,c)); }
    const ly=b.yMin-padding, hy=b.yMax+padding;
    if (Math.abs(dy)<1e-9) { if(look.y<ly || look.y>hy) continue; }
    else { const a=(ly-look.y)/dy, c=(hy-look.y)/dy; near=Math.max(near,Math.min(a,c)); far=Math.min(far,Math.max(a,c)); }
    const lz=b.zMin-padding, hz=b.zMax+padding;
    if (Math.abs(dz)<1e-9) { if(look.z<lz || look.z>hz) continue; }
    else { const a=(lz-look.z)/dz, c=(hz-look.z)/dz; near=Math.max(near,Math.min(a,c)); far=Math.min(far,Math.max(a,c)); }
    if(near<=far && far>=0 && near<=1) first=Math.min(first,Math.max(0,near-.015));
  }
  eye.x=look.x+dx*first; eye.y=look.y+dy*first; eye.z=look.z+dz*first;
  return eye;
}

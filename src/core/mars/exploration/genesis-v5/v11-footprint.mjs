import {genesisLocalToWorld} from './3d/production-collision-adapter.mjs';
import {areasOverlap} from './colony-occupancy.mjs';
// Conservative reservation includes building (-43..13.3), reactor, platforms,
// all towers, courtyard (to z=65), stairs, ramps and connecting/service paths.
// Internal paths belong to this reservation; external protected routes are blockers.
export const V11_LOCAL_ENVELOPE=Object.freeze({xMin:-68,xMax:39,zMin:-64,zMax:69});
export const V11_CLEARANCE=1.2; // exceeds the 0.48m BOBU capsule; not authority
export function v11WorldFootprint(placement){
 if(!placement||![placement.x,placement.z].every(Number.isFinite))throw Error('Invalid placement');
 const b=V11_LOCAL_ENVELOPE,c=V11_CLEARANCE;
 const corners=[[b.xMin-c,b.zMin-c],[b.xMax+c,b.zMin-c],[b.xMin-c,b.zMax+c],[b.xMax+c,b.zMax+c]].map(([x,z])=>genesisLocalToWorld(x,z,placement));
 const xs=corners.map(p=>p[0]),zs=corners.map(p=>p[1]);
 return {id:'v11-full-reservation',kind:'box',x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,halfWidth:(Math.max(...xs)-Math.min(...xs))/2,halfDepth:(Math.max(...zs)-Math.min(...zs))/2};
}
/** Geometry-only review. Never returns authorization or removes obstacles. */
export function checkV11Footprint(placement,{obstacles,protectedRoutes,reservedCells,legalRegions}){
 for(const list of [obstacles,protectedRoutes,reservedCells,legalRegions])if(!Array.isArray(list))throw Error('Incomplete geometry');
 const area=v11WorldFootprint(placement);
 const conflicts=[...obstacles,...protectedRoutes,...reservedCells].filter(o=>areasOverlap(area,o));
 const contained=legalRegions.some(r=>r.kind==='box'&&[r.x,r.z,r.halfWidth,r.halfDepth].every(Number.isFinite)&&r.halfWidth>0&&r.halfDepth>0&&Math.abs(area.x-r.x)+area.halfWidth<=r.halfWidth&&Math.abs(area.z-r.z)+area.halfDepth<=r.halfDepth);
 if(!contained||conflicts.length)throw Error('V11 footprint blocked');
 return area;
}

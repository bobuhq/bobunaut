import {v11WorldFootprint} from './v11-footprint.mjs';

// Local artistic staging only. This is neither a reservation nor placement authority.
export const GREEN_LANDING_ZONE = Object.freeze({x:110,z:-70,radius:55,safetyClearance:3});
export const LANDING_PROTECTED_AREAS = Object.freeze([
 v11WorldFootprint({x:-16,z:-73,rotationY:0}),
 {kind:'box',x:-44,z:-68,halfWidth:14,halfDepth:18},
 {kind:'circle',x:18,z:-28,radius:1.35},
]);
function validObstacle(o){return o && [o.x,o.z].every(Number.isFinite) && (o.kind==='box' ? [o.halfWidth,o.halfDepth].every(v=>Number.isFinite(v)&&v>0) : o.kind==='circle'&&Number.isFinite(o.radius)&&o.radius>0);}
function overlaps(x,z,r,o){
 return o.kind==='box'
  ? Math.hypot(Math.max(Math.abs(x-o.x)-o.halfWidth,0),Math.max(Math.abs(z-o.z)-o.halfDepth,0))<=r
  : Math.hypot(x-o.x,z-o.z)<=r+o.radius;
}
/** Shared landing AND parking predicate. Radius must enclose the entire craft in
 * every orientation (including wings/gear). Callers supply current obstacles,
 * other craft and protected routes as circles or axis-aligned boxes.
 * Pure geometry: success never grants server authorization. */
export function validateLandingOrParking({x,z,vehicleRadius,safetyClearance=GREEN_LANDING_ZONE.safetyClearance},obstacles=[]){
 if(![x,z,vehicleRadius,safetyClearance].every(Number.isFinite)||vehicleRadius<=0||safetyClearance<GREEN_LANDING_ZONE.safetyClearance||!Array.isArray(obstacles)||!obstacles.every(validObstacle))return {valid:false,reason:'invalid-input'};
 const footprint=vehicleRadius+safetyClearance;
 if(Math.hypot(x-GREEN_LANDING_ZONE.x,z-GREEN_LANDING_ZONE.z)+footprint>GREEN_LANDING_ZONE.radius)return {valid:false,reason:'outside-perimeter'};
 if([...LANDING_PROTECTED_AREAS,...obstacles].some(o=>overlaps(x,z,footprint,o)))return {valid:false,reason:'overlap'};
 return {valid:true,reason:'local-geometry-only'};
}
/** Clear decorative rocks only in the development staging area, including rim. */
export function landingPreviewRockVisible(r){
 const extent=Math.max(r.width??0,r.depth??0,r.radius??0)*1.5;
 return Math.hypot(r.x-GREEN_LANDING_ZONE.x,r.z-GREEN_LANDING_ZONE.z)>GREEN_LANDING_ZONE.radius+5+extent;
}

import {readFileSync} from 'node:fs';
import {collectGenesisSourceEvidence} from './genesis-source-evidence.mjs';
import {prepareProductionCampus} from '../src/core/mars/exploration/genesis-v5/production-site.mjs';
import {areasOverlap} from '../src/core/mars/exploration/genesis-v5/colony-occupancy.mjs';
import {v11WorldFootprint} from '../src/core/mars/exploration/genesis-v5/v11-footprint.mjs';
import assert from 'node:assert/strict';
// Offline verifier of a genuine operator-exported snapshot. Never approves or issues.
export function verifyOwnerProposal(p){
 const source=collectGenesisSourceEvidence({includeGeometry:true}),i=p.inventory,s=p.site,w=p.world_snapshot;
 assert.equal(p.release_digest,source.releaseDigest,'Release mismatch');
 assert.equal(i.terrainDigest,source.sourceDigests['public/mars/ares-genesis/ares-genesis-height-16.bin'],'Terrain mismatch');
 assert.deepEqual(i.mapping,{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0});
 assert.equal(s.ownerProposalId,p.id);
 for(const k of ['completeWorldCoverage','externalRoutesComplete','landmarkExtentsVerified'])assert.equal(i[k],true,`Missing owner inventory: ${k}`);
 for(const k of ['colonies','buildings','definitions','landmarks','mission_catalog'])assert(Array.isArray(w[k]),`Missing ${k}`);
 assert.equal(w.colonies.length,1,'Only the existing single-world scope is supported');assert.equal(w.colonies[0].id,p.colony_id);
 const buildings=w.buildings.filter(b=>b.status!=='archived').map(b=>{
  const d=w.definitions.find(d=>d.building_key===b.building_key);assert(d,'Missing building definition');
  assert([b.grid_x,b.grid_z].every(Number.isInteger));assert([0,90,180,270].includes(b.rotation_y));
  let width=d.footprint_width,depth=d.footprint_depth;assert([width,depth].every(v=>Number.isInteger(v)&&v>=1&&v<=8));
  if([90,270].includes(b.rotation_y))[width,depth]=[depth,width];
  return {id:b.id,kind:'box',x:-50.75+(b.grid_x+(width-1)/2)*4.5,z:-74.75+(b.grid_z+(depth-1)/2)*4.5,halfWidth:width*2.25+.6,halfDepth:depth*2.25+.6};
 });
 // Full landmark structures must be supplied separately; survey points are insufficient.
 assert(Array.isArray(i.landmarkExtents));
 for(const l of w.landmarks.filter(l=>l.is_active!==false))assert(i.landmarkExtents.some(e=>e.id===l.landmark_key&&areasOverlap(e,{kind:'circle',x:l.world_x,z:l.world_z,radius:4})),'Missing landmark extent');
 const missions=w.mission_catalog.filter(m=>m.enabled!==false).map(m=>{assert(Number.isFinite(m.target_radius)&&m.target_radius>0);return {id:m.mission_key,kind:'circle',x:m.target_x,z:m.target_z,radius:m.target_radius};});
 const occupied=[...source.sourceGeometry.fixed,...buildings,...i.landmarkExtents,...missions];
 assert.deepEqual(s.occupied,occupied,'Occupied inventory must exactly match source and live snapshot');
 assert.deepEqual(s.placement,{x:-516,z:-213,rotationY:0});
 assert.deepEqual(s.legalRegions,[{kind:'box',x:-530.5,z:-210.5,halfWidth:54.7,halfDepth:67.7}]);
 assert(Array.isArray(i.routes)&&i.routes.length>0,'Missing external routes');
 const routes=i.routes.map(r=>{assert(['entrance','walking','landing_access','service','emergency'].includes(r.route_kind));assert(/^[a-f0-9]{64}$/.test(r.source_digest));assert([r.xMin,r.xMax,r.zMin,r.zMax].every(Number.isFinite)&&r.xMax>r.xMin&&r.zMax>r.zMin);return {id:r.route_key,kind:'box',x:(r.xMin+r.xMax)/2,z:(r.zMin+r.zMax)/2,halfWidth:(r.xMax-r.xMin)/2,halfDepth:(r.zMax-r.zMin)/2};});
 assert.equal(new Set(routes.map(r=>r.id)).size,routes.length,'Duplicate route keys');
 assert.deepEqual(s.protectedRoutes,routes,'Route registry and site must match');
 const envelope=v11WorldFootprint(s.placement);
 for(const route of routes){assert(Math.abs(route.x)+route.halfWidth<=6350&&Math.abs(route.z)+route.halfDepth<=6350);assert(!areasOverlap(route,envelope),'External route intersects campus');}
 // Registry corridors must be traversable on the shipped terrain. The authored Hub
 // stairs connect into the Hub, so their own Hub volumes are not corridor blockers.
 for(const route of routes){
  const authoredStairs=route.id==='command-hub-existing-stairs'&&Math.abs(route.x+44)<1e-8&&Math.abs(route.z+58.1)<1e-8&&Math.abs(route.halfWidth-1.8)<1e-8&&Math.abs(route.halfDepth-.9)<1e-8;
  const blockers=occupied.filter(o=>!missions.some(m=>m.id===o.id)&&!(authoredStairs&&(o.id==='original-command-hub-visual'||w.buildings.some(b=>b.id===o.id&&b.building_key==='command_hub'))));
  assert(!blockers.some(o=>areasOverlap(route,o)),'Route crosses fixed structure or protected area');
  // 1m grid plus endpoints; bound review work rather than silently undersampling.
  assert(route.halfWidth*2*route.halfDepth*2<=100000,'Route rectangle needs subdivision');
  if(!authoredStairs)for(let x=route.x-route.halfWidth;x<=route.x+route.halfWidth+1;x+=1)for(let z=route.z-route.halfDepth;z<=route.z+route.halfDepth+1;z+=1){
   const px=Math.min(x,route.x+route.halfWidth),pz=Math.min(z,route.z+route.halfDepth),sample=source.sourceGeometry.sample;
   const slope=Math.atan(Math.hypot(sample(px+.25,pz)-sample(px-.25,pz),sample(px,pz+.25)-sample(px,pz-.25))/.5)*180/Math.PI;
   assert(Number.isFinite(slope)&&slope<=12,'Route terrain slope rejected');
  }
 }
 const campus=prepareProductionCampus({...s,sample:source.sourceGeometry.sample});
 return {geometryValidated:true,scope:'offline geometry; requires fresh server snapshot and authenticated BOBU owner decision',releaseDigest:source.releaseDigest,obstacles:occupied.length,routes:routes.length,floorWorldY:campus.floorWorldY};
}
if(process.argv[1]?.endsWith('/genesis-verify-owner-proposal.mjs')){
 assert(process.argv[2],'Provide an operator-exported complete proposal JSON');
 console.log(JSON.stringify(verifyOwnerProposal(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
}

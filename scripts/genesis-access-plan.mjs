import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {buildSync} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {collectGenesisSourceEvidence} from './genesis-source-evidence.mjs';
import {verifyOwnerProposal} from './genesis-verify-owner-proposal.mjs';
import {verifyActivationInventory} from './genesis-activation-operation.mjs';
import {HUB_PLACEMENT,INTEGRATED_LAYOUT,INTEGRATED_PAVING,integratedReservations,prepareIntegratedCampus} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
import {areasOverlap} from '../src/core/mars/exploration/genesis-v5/colony-occupancy.mjs';
import {genesisBlockingObstacle} from '../src/core/mars/exploration/genesis-v5/3d/production-collision-adapter.mjs';
import {FlightV2,VEHICLE_RADIUS} from '../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
import {validHandoff} from '../src/core/mars/exploration/flight/handoff.mjs';
import {disembarkActorLocal,EXIT_DURATION} from '../src/core/mars/exploration/flight/disembark-v1.mjs';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const box=(id,xMin,xMax,zMin,zMax)=>({id,kind:'box',x:(xMin+xMax)/2,z:(zMin+zMax)/2,halfWidth:(xMax-xMin)/2,halfDepth:(zMax-zMin)/2});
const bounds=o=>({xMin:o.x-o.halfWidth,xMax:o.x+o.halfWidth,zMin:o.z-o.halfDepth,zMax:o.z+o.halfDepth});
const slope=(sample,x,z)=>Math.atan(Math.hypot(sample(x+.25,z)-sample(x-.25,z),sample(x,z+.25)-sample(x,z-.25))/.5)*180/Math.PI;
const triangleCaches=new WeakMap();
export function triangleSlopes(sample,b){
 let cache=triangleCaches.get(sample);if(!cache){cache=new Map();triangleCaches.set(sample,cache);}
 const result=[],cell=12.5;
 for(let x=Math.floor((b.xMin+6400)/cell)*cell-6400;x<=b.xMax;x+=cell)for(let z=Math.floor((b.zMin+6400)/cell)*cell-6400;z<=b.zMax;z+=cell){
  const key=x+','+z;let pair=cache.get(key);
  if(!pair){const h00=sample(x,z),h10=sample(x+cell,z),h01=sample(x,z+cell),h11=sample(x+cell,z+cell);pair=[Math.atan(Math.hypot(h10-h00,h01-h00)/cell)*180/Math.PI,Math.atan(Math.hypot(h11-h01,h11-h10)/cell)*180/Math.PI];cache.set(key,pair);}
  if(Math.max(b.xMin-x,0)+Math.max(b.zMin-z,0)<=cell)result.push(pair[0]);
  if(Math.min(b.xMax-x,cell)+Math.min(b.zMax-z,cell)>=cell)result.push(pair[1]);
 }
 return result;
}
export function liveBuildings(w){return w.buildings.filter(b=>b.status!=='archived').map(b=>{
 const d=w.definitions.find(d=>d.building_key===b.building_key);assert(d,'Missing live definition');
 assert([0,90,180,270].includes(b.rotation_y));
 let width=d.footprint_width,depth=d.footprint_depth;if([90,270].includes(b.rotation_y))[width,depth]=[depth,width];
 assert([width,depth].every(v=>Number.isInteger(v)&&v>0&&v<=8));
 return {id:b.id,kind:'box',x:-50.75+(b.grid_x+(width-1)/2)*4.5,z:-74.75+(b.grid_z+(depth-1)/2)*4.5,halfWidth:width*2.25+.6,halfDepth:depth*2.25+.6};
});}

// Proposed preservation policy, NOT an inferred geological feature boundary.
export function landmarkPolicy(w,source){return w.landmarks.filter(l=>l.is_active!==false).map(l=>{
 const observed=source.landmarks.find(s=>s.id===l.landmark_key);assert(observed&&observed.x===l.world_x&&observed.z===l.world_z,'Landmark source/server mismatch');
 return {id:l.landmark_key,kind:'circle',x:l.world_x,z:l.world_z,radius:30};
});}

class Heap{
 a=[];
 push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,v=a[0],last=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let c=2*i+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return v;}
}
function spatialIndex(obstacles){
 const cells=new Map(),size=20;
 for(const o of obstacles){const rx=o.halfWidth??o.radius,rz=o.halfDepth??o.radius;for(let x=Math.floor((o.x-rx-2)/size);x<=Math.floor((o.x+rx+2)/size);x++)for(let z=Math.floor((o.z-rz-2)/size);z<=Math.floor((o.z+rz+2)/size);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(o);}}
 return (x,z)=>cells.get(Math.floor(x/size)+','+Math.floor(z/size))??[];
}
const STEP=.5,HALF=.75;
// Every external route has a 1.5m rectangular corridor, wider than the 0.96m capsule.
// Quarter-metre bounds are binary-exact in both JS and PostgreSQL float8/JSONB.
// Search uses an additional .1m margin and checks the whole square, not only its center.
function router(sample,obstacles){
 const index=spatialIndex(obstacles),cache=new Map();
 function pass(x,z){
  const key=x+','+z;if(cache.has(key))return cache.get(key);
  const cell={kind:'box',x,z,halfWidth:HALF+.1,halfDepth:HALF+.1};
  let ok=!index(x,z).some(o=>areasOverlap(cell,o));
  if(ok)ok=triangleSlopes(sample,bounds(cell)).every(s=>Number.isFinite(s)&&s<=12);
  cache.set(key,ok);return ok;
 }
 return (start,target,reachRadius=.5)=>{
  const options=[];
  for(let x=Math.floor((target[0]-reachRadius)/STEP)*STEP;x<=target[0]+reachRadius;x+=STEP)for(let z=Math.floor((target[1]-reachRadius)/STEP)*STEP;z<=target[1]+reachRadius;z+=STEP)if(Math.hypot(x-target[0],z-target[1])<=Math.max(.02,reachRadius-.48))options.push([x,z]);
  options.sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1]));
  const ends=options.filter(p=>pass(...p)),key=p=>p.join(','),endKeys=new Set(ends.map(key));
  assert(pass(...start),'External interface obstructed');assert(ends.length,'Target corridor obstructed: '+target);
  const heuristic=(x,z)=>Math.max(0,Math.abs(x-target[0])+Math.abs(z-target[1])-reachRadius*Math.SQRT2);
  const open=new Heap(),g=new Map([[key(start),0]]),parent=new Map();open.push({p:start,f:heuristic(...start),g:0});
  let found;const limits={xmin:Math.min(start[0],target[0])-150,xmax:Math.max(start[0],target[0])+150,zmin:Math.min(start[1],target[1])-150,zmax:Math.max(start[1],target[1])+150};
  while(open.a.length){const n=open.pop(),k=key(n.p);if(n.g!==g.get(k))continue;if(endKeys.has(k)){found=n.p;break;}
   for(const [dx,dz] of [[STEP,0],[0,STEP],[-STEP,0],[0,-STEP]]){
    const [x,z]=[n.p[0]+dx,n.p[1]+dz];if(x<limits.xmin||x>limits.xmax||z<limits.zmin||z>limits.zmax||!pass(x,z))continue;
    if(!pass(n.p[0]+dx/2,n.p[1]+dz/2))continue;
    const next=key([x,z]),cost=n.g+STEP+(n.dx!==undefined&&(n.dx!==dx||n.dz!==dz)?.02:0);if(cost>=(g.get(next)??Infinity))continue;
    g.set(next,cost);parent.set(next,n.p);open.push({p:[x,z],g:cost,dx,dz,f:cost+heuristic(x,z)});
   }
   assert(g.size<1500000,'Route search exceeded explicit coverage limit');
  }
  assert(found,'No verified access path to '+target);
  const points=[found];while(key(points.at(-1))!==key(start))points.push(parent.get(key(points.at(-1))));points.reverse();
  const simplified=[points[0]];for(let i=1;i<points.length-1;i++)if((points[i][0]-points[i-1][0])!==(points[i+1][0]-points[i][0])||(points[i][1]-points[i-1][1])!==(points[i+1][1]-points[i][1]))simplified.push(points[i]);simplified.push(points.at(-1));
  return simplified;
 };
}
export function pathBoxes(key,points){return points.slice(1).map((p,i)=>{
 const a=points[i];assert(a[0]===p[0]||a[1]===p[1],'Axis-aligned path required');
 return box(key+'-'+String(i+1).padStart(3,'0'),Math.min(a[0],p[0])-HALF,Math.max(a[0],p[0])+HALF,Math.min(a[1],p[1])-HALF,Math.max(a[1],p[1])+HALF);
});}
export function validateRouteGeometry(routes,{sample,obstacles,reservations}){
 let maxSlope=0,samples=0,triangles=0;
 for(const r of routes){
  assert(!reservations.some(o=>areasOverlap(r,o)),'Route overlaps a campus reservation: '+r.id);
  assert(!obstacles.some(o=>areasOverlap(r,o)),'Route intersects an obstacle: '+r.id);
  const b=bounds(r);assert(Object.values(b).every(v=>Number.isFinite(v)&&Math.abs(v)<6350));
  // The actual rendered sampler is piecewise planar on a 12800/1024=12.5m grid.
  // Check the exact constant gradient of EVERY intersecting triangle, including seams.
  for(const s of triangleSlopes(sample,b)){assert(Number.isFinite(s)&&s<=12,'Route triangle exceeds 12 degrees: '+r.id);maxSlope=Math.max(maxSlope,s);triangles++;}
  for(let x=b.xMin;x<=b.xMax+.25;x+=.25)for(let z=b.zMin;z<=b.zMax+.25;z+=.25){assert(Number.isFinite(sample(Math.min(x,b.xMax),Math.min(z,b.zMax))),'Missing route terrain');samples++;}
 }
 return {passed:true,routeRectangleCount:routes.length,gridMeters:.25,samples,exactRenderedTriangleChecks:triangles,maxSlopeDegrees:maxSlope};
}

function validateHubEntrance(entrance,physical,w,sample){
 const dir=mkdtempSync(join(tmpdir(),'genesis-access-hub-'));
 try{
  const output=join(dir,'hub.cjs');
  buildSync({stdin:{contents:'import * as hub from "./src/core/mars/exploration/commandhub/AresCommandHubCollision";import * as walkable from "./src/core/mars/exploration/commandhub/AresCommandHubWalkableSurface";import * as terrain from "./src/core/mars/exploration/engine/AresGenesisTerrainData";export {hub,walkable,terrain};',resolveDir:resolve('.')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
  const {hub,walkable:h,terrain:t}=createRequire(import.meta.url)(output);
  const hubs=w.buildings.filter(b=>b.status!=='archived'&&b.building_key==='command_hub');assert.equal(hubs.length,1);assert.equal(hubs[0].grid_x,0);assert.equal(hubs[0].grid_z,0);
  // Resolve ONLY this known source doorway/stair domain against its actual colliders.
  // The Hub's conservative occupied boxes are retained unchanged in the certificate.
  const resolved=[...physical.filter(o=>o.id!=='original-command-hub-visual'&&o.id!==hubs[0].id),...hub.ARES_COMMAND_HUB_COLLISION_OBSTACLES];
  assert(!resolved.some(o=>areasOverlap(entrance,o)),'Actual Hub doorway or entrance obstruction');
  const bytes=readFileSync('public/mars/ares-genesis/ares-genesis-height-16.bin');
  const terrain={width:t.ARES_GENESIS_HEIGHT_WIDTH,height:t.ARES_GENESIS_HEIGHT_HEIGHT,elevations:Float32Array.from({length:bytes.length/2},(_,i)=>t.ARES_GENESIS_MIN_ELEVATION_METERS+bytes.readUInt16LE(i*2)/65535*(t.ARES_GENESIS_MAX_ELEVATION_METERS-t.ARES_GENESIS_MIN_ELEVATION_METERS))};
  let maxStep=0,minHeight=Infinity,maxHeight=-Infinity;
  for(let x=entrance.x-entrance.halfWidth;x<=entrance.x+entrance.halfWidth;x+=.1){
   let previous;
   for(let z=-59;z<=-57.2+.001;z+=.01){const height=h.sampleAresCommandHubWalkableSurfaceMeters(terrain,x,Math.min(z,-57.2));assert(Number.isFinite(height),'Actual stair surface missing');if(previous!==undefined)maxStep=Math.max(maxStep,Math.abs(height-previous));previous=height;minHeight=Math.min(minHeight,height);maxHeight=Math.max(maxHeight,height);assert(!genesisBlockingObstacle(x,Math.min(z,-57.2),resolved,.48),'Actual entrance capsule blocked');}
  }
  const tail=box('stair-terrain-tail',entrance.x-entrance.halfWidth,entrance.x+entrance.halfWidth,-57.2,-56.625);
  const slopes=triangleSlopes(sample,bounds(tail));assert(slopes.every(s=>s<=12));
  return {actualSourceCollidersValidated:true,capsuleRadius:.48,stairCount:h.ARES_COMMAND_HUB_STAIR_COUNT,stairDepth:h.ARES_COMMAND_HUB_STAIR_DEPTH,maxSampledStepHeightMeters:maxStep,sourceWalkableHeightRange:[minHeight,maxHeight],terrainTailMaxSlopeDegrees:Math.max(...slopes),stairs:'Existing stepped access, not a 12-degree terrain ramp; source step sampler retained'};
 }finally{rmSync(dir,{recursive:true,force:true});}
}

export function buildAccessPlan(observation){
 const source=collectGenesisSourceEvidence({includeGeometry:true}),g=source.sourceGeometry,w=observation.snapshot;
 assert(observation.owner_enrolled,'Owner enrollment observation required');
 assert.equal(observation.existing_routes.length,0,'Existing route reconciliation required');
 assert.equal(w.colonies.length,1,'Unambiguous global colony required');
 const reservations=integratedReservations(),buildings=liveBuildings(w),landmarks=landmarkPolicy(w,source);
 const missions=w.mission_catalog.filter(m=>m.enabled!==false).map(m=>({id:m.mission_key,kind:'circle',x:m.target_x,z:m.target_z,radius:m.target_radius}));
 const occupied=[...g.fixed,...buildings,...landmarks,...missions];
 const campus=prepareIntegratedCampus({layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations,legalRegions:reservations,occupied,protectedRoutes:[],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true,sample:g.sample});
 const physical=[...g.fixed,...buildings,...campus.obstacles];
 // Protected interaction/landmark zones remain walkable; only physical obstacles obstruct capsules.
 const find=router(g.sample,[...physical,...reservations]);
 const start=[-42,-40.5];
 const targets=missions.map(m=>({id:m.id,kind:'walking',point:[m.x,m.z],radius:m.radius}));
 const paths=targets.map(t=>({...t,points:find(start,t.point,t.radius)}));
 const missionRoutes=paths.flatMap(p=>pathBoxes(p.id,p.points));
 const progression=observation.flight_progression;assert(progression&&Number.isInteger(progression.map_min)&&Number.isInteger(progression.map_max));
 const cells=progression.map_max-progression.map_min+1;
 const legalBuildingRegion={id:'progression-building-grid',kind:'box',...g.colonyMapping.aresColonyGridToWorld(progression.map_min,progression.map_min,cells,cells),halfWidth:cells*2.25,halfDepth:cells*2.25};
 const landingPhysical=physical.map(o=>o.kind==='circle'?{...o,radius:o.radius+.6}:o);
 const landingExclusions=[...reservations,...landmarks,...missions,...missionRoutes,legalBuildingRegion];
 const landingFlight=new FlightV2(g.sample,[...landingPhysical,...landingExclusions.map(o=>({...o,groundOnly:true}))]);
 const candidates=[];
 // Finite example candidates; all real touchdowns still require current runtime admission.
 for(let x=-200;x<=500;x+=5)for(let z=-450;z<=300;z+=5){if(!landingFlight.clear(x,z))continue;const support=landingFlight.inspect(x,z,0);if(support.valid)candidates.push({x,z,support});}
 candidates.sort((a,b)=>Math.hypot(a.x-110,a.z+70)-Math.hypot(b.x-110,b.z+70));
 assert(candidates.length,'No support-verified landing example');
 // Select a touchdown and starboard disembark point separated from the protected pedestrian corridor.
 let landing,landingPath;
 for(const c of candidates){const spawn=[c.x+17,c.z],actual=disembarkActorLocal(EXIT_DURATION),actualSpawn=[c.x+actual.x,c.z+actual.z];try{const points=find(start,spawn),boxes=pathBoxes('landing-access',points);
   if(boxes.some(o=>areasOverlap(o,{kind:'circle',x:c.x,z:c.z,radius:VEHICLE_RADIUS+3})))continue;
   if(!validHandoff({spawn:[actualSpawn[0],g.sample(...actualSpawn),actualSpawn[1]],ship:[c.x,c.support.highest+5.15,c.z],yaw:0},[...landingPhysical,legalBuildingRegion],g.sample))continue;
   let connectorClear=true;for(let x=actualSpawn[0];x<=spawn[0];x+=.1)if(genesisBlockingObstacle(x,spawn[1],physical,.48)||slope(g.sample,x,spawn[1])>12)connectorClear=false;
   if(!connectorClear)continue;
   landing={center:{x:c.x,z:c.z},yaw:0,actualV6Handoff:{x:actualSpawn[0],z:actualSpawn[1]},disembarkPoint:{x:spawn[0],z:spawn[1]},conditionalConnector:{from:actualSpawn,to:spawn,designation:'Temporary access from actual source-defined starboard stair endpoint to the corridor outside the 13m parked-craft safety envelope; only the disembarking craft is exempt along its own exit, never other landing craft'},support:c.support};landingPath=points;break;
  }catch(e){if(!/Target corridor obstructed|No verified access path/.test(e.message))throw e;}}
 assert(landing,'No support and access verified landing example');
 paths.push({id:'landing-access',kind:'landing_access',point:[landing.disembarkPoint.x,landing.disembarkPoint.z],radius:.5,points:landingPath});
 const external=paths.flatMap(p=>pathBoxes(p.id,p.points));
 const routeValidation=validateRouteGeometry(external,{sample:g.sample,obstacles:physical,reservations});
 // Stair-to-approach is a NEW designation over source-defined access, not a preexisting protected row.
 const entrance=box('hub-stair-interface',-44-HALF,-44+HALF,-59,-56.625);
 assert(!reservations.some(r=>areasOverlap(entrance,r)));
 const entranceValidation=validateHubEntrance(entrance,physical,w,g.sample);
 const connector=[[-44,-57.2],[-44,-50.5],[-42,-50.5],[-42,-40.5]];
 let connectorMaxSlope=0;
 for(let i=1;i<connector.length;i++){const a=connector[i-1],b=connector[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.1);for(let j=0;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;assert(!genesisBlockingObstacle(x,z,physical,.48),'Campus-interface capsule blocked');const s=slope(g.sample,x,z);assert(s<=12);connectorMaxSlope=Math.max(connectorMaxSlope,s);}}
 const internalPaving=INTEGRATED_PAVING.map(p=>({...p,x:p.x-44,z:p.z-68,designation:'existing-campus-paving-reused; not an external blocker'}));
 const plan={schema:'bobu.genesis.v11.new-access-policy',status:'engineering-verified; pending authenticated owner access-policy decision',landAllocation:'previously approved; unchanged',designation:'ALL routes and 30m landmark zones are NEW proposed owner policy; no historical protection asserted',observedAt:observation.observed_at,coverage:{globalSnapshot:true,allActiveBuildings:true,allFixedSourceObstacles:true,allEnabledMissions:missions.map(m=>m.id),allActiveLandmarks:landmarks.map(l=>l.id),legacyExternalRoutes:0,additionalExternalRoutes:'Only this enumerated new network is designated; no unrecorded historical routes claimed'},corridor:{halfWidth:HALF,fullWidth:HALF*2,capsuleRadius:.48,slopeLimitDegrees:12},externalInterface:{point:start,campusConnector:connector,connectorMaxTerrainSlopeDegrees:connectorMaxSlope,seam:'External 1.5m corridor starts at Z -41.25; reserved courtyard extends to Z -41.4; the 0.15m transition is explicitly included in the validated campus connector, not asserted to be a preexisting protected row'},internalPaving,landmarkZones:landmarks.map(l=>({...l,observedSurveyRadius:4,policyBasis:'30m preservation zone around observed catalog point: 4m survey area plus 26m no-build/no-land buffer; not a surveyed geological perimeter; pedestrian surveying remains permitted'})),paths,entrance:{...entrance,sourceStairs:{xMin:-45.8,xMax:-42.2,zMin:-59,zMax:-57.2,stepCount:4},policy:'Central 1.5m walking strip on retained stairs and terrain interface; existing four steps retained, not graded into a ramp'},landing:{...landing,policy:'Example only; no permanent pad or landing entitlement. For every proposed landing/parking pose revalidate 10m full craft radius + 3m safety against all physical obstacles, 24 campus reservations, all NEW corridors, mission areas and 30m landmark zones, plus actual parked craft; preserve V6 perimeter, support, four pads, relief <=0.8m, pad slope <=6deg, tilt <=5deg, and live handoff. Recompute ground access from a nonintersecting disembark point or reject the landing. No low descent/parking over pedestrian corridors. Physical overflight constraints unchanged.',runtimeStatus:'New external exclusions are policy proposed for owner review; the deployed integration currently supplies only its existing campus exclusions. This artifact does not claim new runtime enforcement.'},validation:routeValidation,sourceDigests:{...source.sourceDigests,'scripts/genesis-access-plan.mjs':sha256(readFileSync('scripts/genesis-access-plan.mjs'))},releaseDigest:source.releaseDigest};
 plan.entrance.validation=entranceValidation;
 plan.landing.progressionExclusion=legalBuildingRegion;
 plan.landing.scope='One currently verified example plus mandatory per-touchdown dynamic revalidation; no assertion that all possible poses are safe';
 plan.landmarkAccess='Protection zones only. No newly designated path to landmark survey centers, and no claim of survey-center reachability; surveying remains permitted under existing gameplay rules.';
 for(const path of paths){
  assert(Math.hypot(path.points.at(-1)[0]-path.point[0],path.points.at(-1)[1]-path.point[1])<=path.radius,'Target outside actual interaction radius');
  let capsuleSamples=0;
  for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.1);for(let j=0;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;assert(!genesisBlockingObstacle(x,z,physical,.48),'Capsule route blocked');capsuleSamples++;}}
  path.validation={capsuleSamples,capsuleRadius:.48,targetDistanceMeters:Math.hypot(path.points.at(-1)[0]-path.point[0],path.points.at(-1)[1]-path.point[1]),passed:true};
 }
 for(const path of ['src/core/mars/exploration/genesis-v5/flight-v2.mjs','src/core/mars/exploration/genesis-v5/green-landing-zone.mjs','src/core/mars/exploration/genesis-v5/spacecraft-v3.mjs','src/core/mars/exploration/flight/handoff.mjs','src/core/mars/exploration/flight/disembark-v1.mjs','src/core/mars/exploration/flight/CinematicLanding.tsx','src/core/mars/exploration/flight/AresFlightSession.tsx','src/core/mars/exploration/genesis-v5/AresColonyOccupancyAdapter.ts'])plan.sourceDigests[path]=sha256(readFileSync(path));
 const planDigest=sha256(json(plan));
 const routes=[{...entrance,route_kind:'entrance'},...paths.flatMap(p=>pathBoxes(p.id,p.points).map(r=>({...r,route_kind:p.kind})))].map(r=>({route_key:r.id,route_kind:r.route_kind,...bounds(r),source_digest:planDigest,designation:'new-owner-policy'}));
 const protectedRoutes=routes.map(r=>box(r.route_key,r.xMin,r.xMax,r.zMin,r.zMax));
 const site={ownerProposalId:null,layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations,legalRegions:reservations,occupied,protectedRoutes,reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true};
 const inventory={completeWorldCoverage:true,externalRoutesComplete:true,geometryValidated:true,landmarkExtentsVerified:true,completenessScope:'Complete NEW owner-defined access policy for the observed global snapshot and all declared fixed source obstacles; not historical corridor recovery or owner approval',mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},terrainDigest:source.sourceDigests['public/mars/ares-genesis/ares-genesis-height-16.bin'],sourceRevision:'b4f04394e4928a0e4e758545649a4fcdaa5526f1',routes,landmarkExtents:landmarks,accessPolicyDigest:planDigest,accessPolicyApproval:'pending',landAllocationApproval:'already approved; unchanged',runtimeEnforcementOfNewFlightExclusions:false};
 // Completeness is established by enumerated scope and checks above, never by an owner identity claim.
 const id=randomUUID(),created_at=new Date().toISOString(),valid_until=new Date(Date.parse(created_at)+23*3600000).toISOString();site.ownerProposalId=id;
 // Public evidence contains geometry and a binding to the full private proposal snapshot,
 // not colony members, account UUIDs, contribution balances or user/profile records.
 const publicObservation={observedAt:observation.observed_at,worldSnapshotDigest:sha256(json(w)),epoch:w.epoch,ownerEnrollmentVerified:observation.owner_enrolled,counts:{colonies:w.colonies.length,buildingRecords:w.buildings.length,activeBuildings:buildings.length,landmarks:landmarks.length,missions:missions.length,existingExternalRoutes:observation.existing_routes.length},buildings,missions,landmarks,flightProgression:observation.flight_progression};
 const evidence={schema:'bobu.genesis.v11.access-evidence',observation:publicObservation,plan,inventory,site,verificationSource:{generator:readFileSync('scripts/genesis-access-plan.mjs','utf8'),tests:readFileSync('tests/genesis-v11/access-plan.test.mjs','utf8'),deployedSourceCommit:inventory.sourceRevision},authorization:{ownerLandAllocation:'previously approved per owner instruction',accessPolicyDecision:'pending',certificateIssued:false}};
 const evidenceBytes=json(evidence),evidence_digest=sha256(evidenceBytes);
 // Archive the exact bytes INSIDE the existing immutable proposal inventory. The
 // existing owner-only stable RPC is the real HTTPS retrieval endpoint; the JSON
 // pointer selects the archive content from its authenticated response. This does
 // not expose a new schema, publish account data, or require a hosting deployment.
 const archiveEndpoint='https://pvemtnmeewyaqgindocs.supabase.co/rest/v1/rpc/get_ares_genesis_owner_proposal_v11?proposal='+id;
 inventory.evidenceArchive={encoding:'utf-8',mediaType:'application/json',sha256:evidence_digest,content:evidenceBytes,retrieval:archiveEndpoint,payloadJsonPointer:'/inventory/evidenceArchive/content'};
 const proposal={id,colony_id:w.colonies[0].id,release_digest:source.releaseDigest,evidence_digest,evidence_uri:archiveEndpoint+'#/inventory/evidenceArchive/content',world_snapshot:w,site,inventory,valid_until,created_at};
 // This locator becomes populated only if real production registration succeeds.
 verifyOwnerProposal(proposal);
 verifyActivationInventory(proposal);
 return {plan,evidenceBytes,proposal};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(existsSync('docs/genesis-v11-access-registration.json'))assert(!JSON.parse(readFileSync('docs/genesis-v11-access-registration.json','utf8')).registered,'Preserve registered immutable proposal artifacts; do not overwrite them by regeneration');
 const observation=JSON.parse(readFileSync('docs/genesis-v11-access-observation.json','utf8'));
 const {plan,evidenceBytes,proposal}=buildAccessPlan(observation);
 writeFileSync('docs/genesis-v11-access-plan.json',json(plan));
 writeFileSync('docs/genesis-v11-access-evidence.json',evidenceBytes);
 writeFileSync('docs/genesis-v11-access-proposal.json',json(proposal));
 console.log(JSON.stringify({status:plan.status,paths:plan.paths.length,rectangles:proposal.inventory.routes.length,landmarks:plan.landmarkZones.length,validation:plan.validation,proposalId:proposal.id,evidenceDigest:proposal.evidence_digest,registered:false}));
}

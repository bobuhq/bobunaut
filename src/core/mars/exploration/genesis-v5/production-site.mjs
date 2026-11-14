// Standalone legacy preview geometry. The live Hub integration uses integrated-campus.mjs.
import {createV11CampusPlan} from './v11-campus-plan.mjs';
import {towers} from './v11-composition.mjs';
import {v11PavingFloor} from './v11-movement.mjs';
import {V11_LOCAL_ENVELOPE, V11_CLEARANCE, checkV11Footprint} from './v11-footprint.mjs';
import { campusWorldObstacles, validateCampusOccupancy} from './3d/campus-layout.mjs';
import {genesisLocalToWorld, genesisWorldToLocal, genesisInteriorFloorAt, createGenesisCollisionObstacles} from './3d/production-collision-adapter.mjs';

// Build-time/source-controlled switch. Never read query strings or browser storage.
export const ARES_GENESIS_CAMPUS_ENABLED = true; // Runtime support only; not placement authorization.
// No preview coordinates: live occupancy, route and placement reservations are unknown.
export const ARES_GENESIS_PRODUCTION_SITE = null;

/** Conservative full-envelope reservation, including apron, reactor and service paths.
 * The host must provide a complete, current occupancy/reservation snapshot. */
export function prepareProductionCampus({placement, sample, occupied, occupancyComplete, routesReserved, placementReserved,legalRegions,protectedRoutes,reservedCells}) {
 if(occupancyComplete!==true || routesReserved!==true || placementReserved!==true) throw Error('Production occupancy/routes/placement reservation unavailable');
 if(!placement || ![placement.x,placement.z].every(Number.isFinite) || ![0,90,180,270].includes(placement.rotationY)) throw Error('Invalid production placement');
 if(!Array.isArray(occupied) || occupied.some(o=>!o || ![o.x,o.z].every(Number.isFinite) || (o.kind==='box' ? ![o.halfWidth,o.halfDepth].every(v=>Number.isFinite(v)&&v>0) : !Number.isFinite(o.radius)||o.radius<=0))) throw Error('Invalid occupancy');
 const world=(x,z)=>genesisLocalToWorld(x,z,placement);
 const ground=(x,z)=>{const [wx,wz]=world(x,z);if(Math.abs(wx)>6350||Math.abs(wz)>6350)throw Error('Outside production terrain');const y=sample(wx,wz);if(!Number.isFinite(y))throw Error('Missing production terrain');return y;};
 const heights=[];
 for(let x=V11_LOCAL_ENVELOPE.xMin-V11_CLEARANCE;x<=V11_LOCAL_ENVELOPE.xMax+V11_CLEARANCE;x+=.5)for(let z=V11_LOCAL_ENVELOPE.zMin-V11_CLEARANCE;z<=V11_LOCAL_ENVELOPE.zMax+V11_CLEARANCE;z+=.5){const h=ground(x,z);heights.push(h);if(Math.atan(Math.hypot(ground(x+.25,z)-ground(x-.25,z),ground(x,z+.25)-ground(x,z-.25))/.5)*180/Math.PI>12)throw Error('Production slope rejected');}
 const min=Math.min(...heights),max=Math.max(...heights);
 if(max-min+.3>2.5)throw Error('Production foundation relief rejected');
 // A single conservative reservation also protects routes between facilities.
 const envelope=checkV11Footprint(placement,{obstacles:occupied,legalRegions,protectedRoutes,reservedCells});
 const {x:cx,z:cz}=envelope;
 for(const o of occupied){const dx=Math.max(Math.abs(cx-o.x)-envelope.halfWidth-(o.kind==='box'?o.halfWidth:0),0),dz=Math.max(Math.abs(cz-o.z)-envelope.halfDepth-(o.kind==='box'?o.halfDepth:0),0);if(o.kind==='box'?dx<=.6&&dz<=.6:Math.hypot(dx,dz)<=o.radius+.6)throw Error('Production envelope occupied');}
 const floorWorldY=max+.3,rootY=floorWorldY-1.2;
 const surfaceAtLocal=(x,z)=>ground(x,z)-rootY;
 const rampEndY=Math.max(...[-2.1,0,2.1].map(x=>ground(x,26)))+.12;
 if(Math.atan(Math.abs(floorWorldY-rampEndY)/12.8)*180/Math.PI>12)throw Error('Production ramp slope rejected');
 for(let x=-2.1;x<=2.1;x+=.3)for(let z=13.2;z<=26;z+=.25)if(floorWorldY+(rampEndY-floorWorldY)*(z-13.2)/12.8-ground(x,z)<-.02)throw Error('Production ramp buried');
 const plan=createV11CampusPlan(surfaceAtLocal);
 validateCampusOccupancy(plan,placement,genesisLocalToWorld,[...occupied,...createGenesisCollisionObstacles(placement)]);
 return {placement,rootY,floorWorldY,rampEndY,surfaceAtLocal,plan,envelope};
}
export function productionCampusObstacles(site,doors){return [...createGenesisCollisionObstacles(site.placement,doors),...campusWorldObstacles(site.plan,site.placement,genesisLocalToWorld),...towers.map(t=>{const [x,z]=genesisLocalToWorld(t.x,t.z,site.placement);return {kind:'circle',x,z,radius:1.6};})];}
export function productionCampusFloor(site,x,z){
 const floor=genesisInteriorFloorAt(x,z,site.placement,site.floorWorldY);if(floor!==null)return floor;
 const [lx,lz]=genesisWorldToLocal(x,z,site.placement);
 return Math.abs(lx)<=2.05&&lz>=13.2&&lz<=26 ? site.floorWorldY+(site.rampEndY-site.floorWorldY)*(lz-13.2)/12.8 : v11PavingFloor(site,x,z);
}

import {CAMPUS_ASSETS,createCampusPlan,campusWorldObstacles} from './3d/campus-layout.mjs';
import {towers} from './v11-composition.mjs';
import {areasOverlap} from './colony-occupancy.mjs';
import {genesisLocalToWorld,genesisWorldToLocal} from './3d/production-collision-adapter.mjs';
export const INTEGRATED_LAYOUT='integrated-command-hub-v11';
export const HUB_PLACEMENT=Object.freeze({x:-44,z:-68,rotationY:0});
// Authored additions only. The existing Hub, its stairs and player buildings are
// never replaced, filtered from occupancy, or reserved as new campus land.
export const INTEGRATED_ASSETS=Object.freeze([
 {...CAMPUS_ASSETS.find(a=>a.id==='greenhouse'),x:-34,z:-4,width:19,depth:11,scale:2.15,height:6.45},
 {...CAMPUS_ASSETS.find(a=>a.id==='habitat'),x:21,z:5,width:14,depth:14,scale:1.35},
]);
export const INTEGRATED_RELAYS=Object.freeze([
 {...towers.find(t=>t.id==='yellow'),x:-60,z:8},
 {...towers.find(t=>t.id==='red'),x:36,z:-32},
 {...towers.find(t=>t.id==='green'),x:36,z:48},
]);
const box=(id,x,z,halfWidth,halfDepth)=>({id,kind:'box',x,z,halfWidth,halfDepth});
// Local metre coordinates relative to the ONE existing Command Hub.
export const INTEGRATED_PAVING=Object.freeze([
 box('hub-approach',0,17.5,1.2,5.5), // world Z -56..-45: meets bottom of existing stairs
 box('courtyard',2,21,6,5),
 box('west-walk',-30,23,30,1.2),
 box('greenhouse-walk',-34,13,1.2,10),
 box('west-relay-walk',-60,18,1.2,5),
 box('research-walk',18,15,18,1.2),
 box('research-approach',21,14,1.2,1),
 box('east-walk',41,15,5,1.2),
 box('east-service-walk',46,-8.5,1.2,23.5),
 box('rear-relay-walk',43.5,-32,2.5,1.2),
 box('front-service-walk',46,31.5,1.2,16.5),
 box('front-relay-walk',43.5,48,2.5,1.2),
]);
export const INTEGRATED_LAMPS=Object.freeze([{x:-2,z:18},{x:6,z:24},{x:-22,z:25},{x:-42,z:25},{x:24,z:13},{x:48,z:2},{x:48,z:40}]);
export function integratedReservations(){
 const objects=[...INTEGRATED_ASSETS.map(s=>box(s.id,s.x,s.z,s.width/2,s.depth/2)),...INTEGRATED_RELAYS.map(t=>box('relay-'+t.id,t.x,t.z,4,4)),...INTEGRATED_PAVING,...INTEGRATED_LAMPS.map((p,i)=>box('lamp-'+i,p.x,p.z,.16,.16))];
 return objects.map(o=>({...o,x:o.x+HUB_PLACEMENT.x,z:o.z+HUB_PLACEMENT.z,halfWidth:o.halfWidth+.6,halfDepth:o.halfDepth+.6}));
}
export function checkIntegratedFootprint(site){
 if(site?.layout!==INTEGRATED_LAYOUT||site.placement?.x!==-44||site.placement?.z!==-68||site.placement?.rotationY!==0)throw Error('Integrated Hub layout required; distant certificates are obsolete');
 for(const key of ['occupied','protectedRoutes','reservedCells','legalRegions'])if(!Array.isArray(site[key]))throw Error('Incomplete integrated geometry');
 const regions=integratedReservations();
 if(!Array.isArray(site.reservations)||site.reservations.length!==regions.length||regions.some((r,i)=>Object.keys(r).some(k=>site.reservations[i]?.[k]!==r[k])))throw Error('Integrated reservation contract mismatch');
 for(const a of regions){
  if(Math.abs(a.x)+a.halfWidth>6350||Math.abs(a.z)+a.halfDepth>6350)throw Error('Outside production terrain');
  if([...site.occupied,...site.protectedRoutes,...site.reservedCells].some(b=>areasOverlap(a,b)))throw Error('Integrated footprint blocked: '+a.id);
  if(!site.legalRegions.some(r=>r.kind==='box'&&[r.x,r.z,r.halfWidth,r.halfDepth].every(Number.isFinite)&&Math.abs(a.x-r.x)+a.halfWidth<=r.halfWidth+1e-10&&Math.abs(a.z-r.z)+a.halfDepth<=r.halfDepth+1e-10))throw Error('Integrated entitlement missing: '+a.id);
 }
 return regions;
}
export function prepareIntegratedCampus(input){
 if(input.occupancyComplete!==true||input.routesReserved!==true||input.placementReserved!==true)throw Error('Production occupancy/routes/placement reservation unavailable');
 const reservations=checkIntegratedFootprint(input),{sample}=input;
 const surfaceAtLocal=(x,z)=>{const h=sample(x-44,z-68);if(!Number.isFinite(h))throw Error('Missing production terrain');return h;};
 const plan=createCampusPlan(surfaceAtLocal,INTEGRATED_ASSETS,false);
 // createCampusPlan's legacy service spine belongs to its standalone preview.
 plan.path=[];
 const solids=campusWorldObstacles(plan,HUB_PLACEMENT,genesisLocalToWorld);
 for(const t of INTEGRATED_RELAYS)solids.push({id:'relay-'+t.id,kind:'circle',x:t.x-44,z:t.z-68,radius:4});
 for(const s of solids)for(const o of solids)if(o!==s&&areasOverlap(s,o))throw Error('Integrated structures overlap');
 // Validate every reserved square metre, including terrain-following paths/relay feet.
 for(const a of reservations)for(let x=a.x-a.halfWidth;x<=a.x+a.halfWidth+.5;x+=.5)for(let z=a.z-a.halfDepth;z<=a.z+a.halfDepth+.5;z+=.5){
  const px=Math.min(x,a.x+a.halfWidth),pz=Math.min(z,a.z+a.halfDepth);
  const h=sample(px,pz),slope=Math.atan(Math.hypot(sample(px+.25,pz)-sample(px-.25,pz),sample(px,pz+.25)-sample(px,pz-.25))/.5)*180/Math.PI;
  if(!Number.isFinite(h)||!Number.isFinite(slope)||slope>12)throw Error('Integrated terrain slope rejected');

 }
 // Paving and relay access must not run through the new sealed asset footprints.
 for(const path of INTEGRATED_PAVING){const p={...path,x:path.x-44,z:path.z-68};if(solids.some(s=>areasOverlap(p,s)))throw Error('Integrated walkway crosses structure: '+path.id);}
 const lamps=INTEGRATED_LAMPS.map((p,i)=>({id:'campus-lamp-'+i,kind:'circle',x:p.x-44,z:p.z-68,radius:.16}));
 for(const lamp of lamps)if(input.occupied.some(o=>areasOverlap({...lamp,radius:lamp.radius+.6},o)))throw Error('Lamp conflicts with occupancy');
 for(const o of solids){const asset=plan.sites.find(s=>'campus-'+s.id===o.id);o.topY=asset?asset.deck+asset.height:surfaceAtLocal(o.x+44,o.z+68)+13;}
 for(const lamp of lamps)lamp.topY=sample(lamp.x,lamp.z)+.97;
 const cameraSolids=plan.colliders.concat(INTEGRATED_RELAYS.map(t=>({id:'relay-'+t.id,category:'relay',xMin:t.x-4,xMax:t.x+4,zMin:t.z-4,zMax:t.z+4,yMin:surfaceAtLocal(t.x,t.z),yMax:surfaceAtLocal(t.x,t.z)+13})));
 return {placement:HUB_PLACEMENT,layout:INTEGRATED_LAYOUT,rootY:0,plan,reservations,surfaceAtLocal,obstacles:[...solids,...lamps],lamps,cameraSolids};
}
export function integratedCampusFloor(site,x,z){
 const [lx,lz]=genesisWorldToLocal(x,z,HUB_PLACEMENT);
 // Preserve original Hub floor/stair sampler by returning null in its entire domain.
 if(Math.abs(lx)<=9.6&&lz>=-10&&lz<=10.8)return null;
 return INTEGRATED_PAVING.some(p=>Math.abs(lx-p.x)<=p.halfWidth&&Math.abs(lz-p.z)<=p.halfDepth)?site.surfaceAtLocal(lx,lz)+.035:null;
}

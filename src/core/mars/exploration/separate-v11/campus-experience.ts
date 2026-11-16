import type {Traversal} from './campus-traversal.mjs';
import {inside} from './campus-traversal.mjs';
import type {PlannedBuilding} from './connected-campus-layout.mjs';
export type CameraEnvironment={floor:number;ceiling:number;narrow:boolean};
export type CampusDoor={id:string;x:number;z:number;floor:number};
export function createCampusExperience(model:Traversal,buildings:PlannedBuilding[],hubFloor:number){
 const research=buildings.find(b=>b.id==='habitat')!;
 const bridge=model.links[0];
 const doors:CampusDoor[]=[{id:'v12-hub-rear',x:-40,z:-76.55,floor:model.floor(-40,-76.55)!},{id:'v12-genesis-rear',x:research.worldX,z:research.worldZ-5.4,floor:model.floor(research.worldX,research.worldZ-5.4)!}];
 const environmentAt=(x:number,z:number):CameraEnvironment|null=>{
  const floor=model.floor(x,z);
  if(floor!==null)return {floor,ceiling:floor+3.6,narrow:true};
  if(Math.abs(x+44)<7.55&&Math.abs(z+68)<8.55)return {floor:hubFloor,ceiling:hubFloor+4.1,narrow:false};
  if(Math.abs(x-research.worldX)<6.7&&Math.abs(z-research.worldZ)<6.7)return {floor:research.plan.sites[0].deck+.4,ceiling:research.plan.sites[0].deck+4.0,narrow:false};
  if(x>=bridge.a[0]&&x<=bridge.b[0]&&Math.abs(z-bridge.a[2])<1.4){const y=model.walkable(x,z)!;return {floor:y,ceiling:y+3.6,narrow:true};}
  // Pre-compress the camera on both approaches, before its boom reaches a lintel.
  for(const d of doors)if(Math.abs(x-d.x)<2.0&&Math.abs(z-d.z)<3.2)return {floor:d.floor,ceiling:d.floor+3.1,narrow:true};
  if(Math.abs(x+44)<2.3&&z>-60.5&&z<-56.6)return {floor:hubFloor,ceiling:hubFloor+3.3,narrow:true};
  if(Math.abs(x-research.worldX)<2.3&&z>research.worldZ+5.5&&z<research.worldZ+9.8)return {floor:model.walkable(x,z)??research.plan.sites[0].deck+.4,ceiling:research.plan.sites[0].deck+3.8,narrow:true};
  return null;
 };
 const interiorAt=(x:number,z:number)=>
  model.rects.some(r=>inside(r,x,z))||
  (Math.abs(x+44)<7.55&&Math.abs(z+68)<8.55)||
  (Math.abs(x-research.worldX)<6.7&&Math.abs(z-research.worldZ)<6.7)||
  (x>=bridge.a[0]&&x<=bridge.b[0]&&Math.abs(z-bridge.a[2])<1.4);
 return {doors,environmentAt,interiorAt};
}
/** A hysteretic proximity door. Priming never queues a sound on page load.
 * Staying in the threshold cannot retrigger it; closing waits until clear. */
export class DoorPassageSensor {
 open=false;private initialized=false;private clearSince:number|null=null;
 constructor(readonly door:CampusDoor){}
 update(x:number,z:number,time:number):boolean|null{
  const dx=Math.abs(x-this.door.x),dz=Math.abs(z-this.door.z);
  const near=dx<=1.8&&dz<=2.4,clear=dx>2.2||dz>3.0;
  if(!this.initialized){this.initialized=true;this.open=near;return null;}
  if(!this.open&&near){this.open=true;this.clearSince=null;return true;}
  if(this.open&&clear){this.clearSince??=time;if(time-this.clearSince>=.45){this.open=false;this.clearSince=null;return false;}}
  else this.clearSince=null;
  return null;
 }
}

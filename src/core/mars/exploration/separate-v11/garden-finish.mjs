import {inside} from './campus-traversal.mjs';
// Visual-only finish schedule. No walkable callback or collision mutation.
const WATER={xMin:-41.8,xMax:3.2,zMin:-65.8,zMax:-20.8};
const HUB={xMin:-61,xMax:-27,zMin:-80,zMax:-59};
export function gardenGroundClear(x,z,researchX=-7){
 if(inside(WATER,x,z,.2)||inside(HUB,x,z,.15))return false;
 if(Math.abs(x+44)<2.2&&z<-57.15&&z>-60)return false;
 if(Math.abs(x-researchX)<7.2&&z>=-89.2&&z<=-74.9)return false;
 if(Math.abs(x-researchX)<2.7&&z>=-75.5&&z<=-71.35)return false;
 if(x>=-79.7&&x<=-60.3&&z>=-73.7&&z<=-62.3)return false;
 return true;
}
export function createGardenFinish(plan){
  // Retain the legacy consumer shape while retiring its visual schedule.
  const last=plan.paths.at(-1);
  return {approved:[],edgeBands:[],gravelBands:[],edgeLights:[],beds:[],
    forecourt:{xMin:-45.65,xMax:-42.35,zMin:-56.9,zMax:-53.7},
    joints:[],studs:[],researchX:last?(last.xMin+last.xMax)/2:-7};
}

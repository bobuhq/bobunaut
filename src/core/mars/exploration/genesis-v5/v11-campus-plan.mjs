import {CAMPUS_ASSETS} from './3d/campus-layout.mjs';
import {greenhouse} from './v11-composition.mjs';
export function createV11CampusPlan(surface){
 const sites=CAMPUS_ASSETS.filter(a=>a.id==='habitat'||a.id==='greenhouse').map(a=>{
 const g=a.id==='greenhouse';const x=g?greenhouse.x:19,z=g?greenhouse.z:1;
 const width=g?19:14,depth=g?11:14;
 const feet=[-1,1].flatMap(sx=>[-1,1].map(sz=>({x:x+sx*(width/2-.6),z:z+sz*(depth/2-.6)}))).map(p=>({...p,ground:surface(p.x,p.z)}));
 const max=Math.max(...feet.map(f=>f.ground)),min=Math.min(...feet.map(f=>f.ground));
 return {...a,x,z,width,depth,scale:g?2.15:1.35,feet,max,min,slope:0,deck:max+.18};});
 return {sites,path:[],colliders:sites.map(s=>({id:s.id,category:'structure',xMin:s.x-s.width/2,xMax:s.x+s.width/2,zMin:s.z-s.depth/2,zMax:s.z+s.depth/2,yMin:s.min,yMax:s.deck+s.height}))};
}

import {inside,unionPlan} from './campus-traversal.mjs';
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
const rect=(x,z,width,depth)=>({xMin:x-width/2,xMax:x+width/2,zMin:z-depth/2,zMax:z+depth/2});
export function createGardenFinish(plan){
 const last=plan.paths.at(-1),researchX=(last.xMin+last.xMax)/2;
 const approved=plan.cells.filter(c=>plan.paths.some(p=>inside(p,(c.xMin+c.xMax)/2,(c.zMin+c.zMax)/2)));
 const {edges}=unionPlan(approved),edgeBands=[],gravelBands=[],edgeLights=[];
 const clear=r=>[[r.xMin,r.zMin],[r.xMax,r.zMin],[r.xMin,r.zMax],[r.xMax,r.zMax]].every(([x,z])=>gardenGroundClear(x,z,researchX));
 for(const e of edges){
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],length=Math.hypot(dx,dz),count=Math.ceil(length/.8);
  let nx=-dz/length,nz=dx/length;
  const mx=(e.a[0]+e.b[0])/2,mz=(e.a[1]+e.b[1])/2;
  if(approved.some(p=>inside(p,mx+nx*.02,mz+nz*.02))){nx=-nx;nz=-nz;}
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,x=e.a[0]+dx*t,z=e.a[1]+dz*t;
   const band=(offset,width,trim=0)=>rect(x+nx*offset,z+nz*offset,dx===0?width:length/count-trim,dz===0?width:length/count-trim);
   const alloy=band(.005,.085);if(clear(alloy))edgeBands.push(alloy);
   const gravel=band(.16,.22);if(clear(gravel))gravelBands.push(gravel);
   const light=band(-.075,.026,.18);if(i%2===0&&clear(light))edgeLights.push(light);
  }
 }
 const beds=[];
 const addBed=(id,x,z,width,depth,seed)=>{const r=rect(x,z,width,depth);if(!clear(r))return;
  if(plan.paths.some(p=>r.xMin<p.xMax+.12&&r.xMax>p.xMin-.12&&r.zMin<p.zMax+.12&&r.zMax>p.zMin-.12))return;
  if(plan.obstacles.some(o=>o.kind==='box'&&Math.abs(o.x-x)<o.halfWidth+width/2+.12&&Math.abs(o.z-z)<o.halfDepth+depth/2+.12))return;
  beds.push({id,x,z,width,depth,seed});};
 // Paired recessed bio-beds respect the narrow clearance beside active Water.
 const addPair=(prefix,cx,z,offset,width,depth,seed)=>{
  const start=beds.length;for(const side of [-1,1])addBed(prefix+'-'+side,cx+side*offset,z,width,depth,seed+(side>0?1:0));
  if(beds.length-start!==2)beds.splice(start); // Avoid one-sided remnants at obstacles.
 };
 for(const [i,z] of [-48.5,-44.7,-40.9,-37.1,-32.7,-28.9,-25.1,-21.3].entries())addPair('hub-axis-'+i,-44,z,1.6,.3,1.65,i*2);
 addPair('hub-arrival',-44,-51.25,1.6,.3,.65,30);
 addPair('botanical-approach',-70,-57.25,4,2.4,.65,35);
 // Low courtyard islands reinforce existing raised beds/seating without new barriers.
 for(const [i,b] of [[-70,-53.2,4.2,.6],[-51,-51.8,3.3,1.0],[-51.2,-47.1,2.6,.8],[10.4,-63,1.4,2.0]].entries())addBed('court-island-'+i,...b,i+40);
 addPair('genesis-arrival',researchX,-68.8,3.5,1.15,1.2,60);
 const forecourt={xMin:-45.65,xMax:-42.35,zMin:-56.9,zMax:-53.7};
 const joints=[];for(let z=-51.4;z<-18;z+=3.8){const r=rect(-44,z,2.24,.014);if(clear(r))joints.push(r);}
 const studs=[];
 for(const z of [-56.7,-53.8,-49.1,-41.5,-33.9,-26.3,-18.7])for(const side of [-1,1]){
  const x=-44+side*(z<-53?1.76:1.15);if(gardenGroundClear(x,z,researchX))studs.push({x,z,purple:z===-53.8});
 }
 return {approved,edgeBands,gravelBands,edgeLights,beds,forecourt,joints,studs,researchX};
}

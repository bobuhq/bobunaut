import {inside,unionPlan,edgeObstacle} from './campus-traversal.mjs';
// Existing Water parcel stays untouched. The exterior promenade wraps its west,
// south and east boundaries rather than drawing a path through the active colony.
const water={xMin:-41.8,xMax:3.2,zMin:-65.8,zMax:-20.8};
const strip=(ax,az,bx,bz,width=2.4)=>({xMin:Math.min(ax,bx)-width/2,xMax:Math.max(ax,bx)+width/2,zMin:Math.min(az,bz)-width/2,zMax:Math.max(az,bz)+width/2});
export function createCampusLandscape(buildings,terrainAt){
 const research=buildings.find(b=>b.id==='habitat');if(!research)return null;
 const paths=[strip(-44,-57.25,-44,-55.5,3.6),strip(-70,-55.5,-44,-55.5),strip(-70,-60.8,-70,-55.5),strip(-44,-55.5,-44,-17),strip(-44,-17,7,-17),strip(7,-17,7,-71.4),strip(7,-71.4,research.worldX,-71.4),strip(research.worldX,-71.4,research.worldX,-73.8)];
 const plazas=[{xMin:-79,xMax:-61,zMin:-58.4,zMax:-52.2},{xMin:-56,xMax:-46,zMin:-53.8,zMax:-44},{xMin:5,xMax:15,zMin:-68,zMax:-58}];
 const rects=[...paths,...plazas],union=unionPlan(rects);
 const safe=(x,z)=>!inside(water,x,z,.5)&&!buildings.some(b=>Math.abs(x-b.worldX)<b.footprint.halfX&&Math.abs(z-b.worldZ)<b.footprint.halfZ);
 const cells=union.cells.filter(r=>safe((r.xMin+r.xMax)/2,(r.zMin+r.zMax)/2));
 const planters=[[-77,-57.5],[-63,-57.5],[-54,-49],[-48,-46],[12,-66],[12,-60],[-32,-14.8],[-15,-14.8]].map(([x,z],i)=>({x,z,width:i>5?3.4:2.3,depth:1.3,id:'contained-planter-'+i}));
 // Furniture and lights sit alongside promenade clear width, never on its centre.
 const benches=[[-77,-52.9],[-63,-52.9],[-52,-45.1],[13,-63]].map(([x,z])=>({x,z}));
 const lamps=[[-73,-58.2],[-67,-58.2],[-44,-52],[-44,-35],[-44,-20],[-35,-17],[-18,-17],[0,-17],[7,-29],[7,-46],[7,-62],[-4,-71.4]].map(([x,z])=>Math.abs(z+17)<.01||Math.abs(z+71.4)<.01?[x,z+1.45]:[x+1.45,z]);
 const obstacles=[...planters.map(p=>({kind:'box',x:p.x,z:p.z,halfWidth:p.width/2,halfDepth:p.depth/2})),...benches.map(p=>({kind:'box',x:p.x,z:p.z,halfWidth:1.2,halfDepth:.35}))];
 const floor=(x,z)=>safe(x,z)&&cells.some(r=>inside(r,x,z))?terrainAt(x,z)+(paths.some(r=>inside(r,x,z))?.055:.035):null;
 // Only plaza perimeters get low borders; keep every path junction open.
 const borders=union.edges.filter(e=>{
  const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;
  return plazas.some(p=>inside(p,x,z,.001)&&(Math.abs(x-p.xMin)<.001||Math.abs(x-p.xMax)<.001||Math.abs(z-p.zMin)<.001||Math.abs(z-p.zMax)<.001));
 });
 obstacles.push(...lamps.map(([x,z])=>({kind:'box',x,z,halfWidth:.09,halfDepth:.09})));
 obstacles.push(...borders.map(e=>edgeObstacle(e,.18)));
 return {cells,plazas,paths,planters,benches,lamps,borders,obstacles,floor,terrainAt};
}

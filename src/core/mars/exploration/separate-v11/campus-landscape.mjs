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
 // V13: remove every former pot, bench and bollard, including their
 // invisible colliders. Keep approved cells and walkable floor unchanged.
 const planters=[];
 const benches=[];
 const lamps=[];
 const obstacles=[];
 const floor=(x,z)=>safe(x,z)&&cells.some(r=>inside(r,x,z))?terrainAt(x,z)+(paths.some(r=>inside(r,x,z))?.055:.035):null;
 // Only plaza perimeters get low borders; keep every path junction open.
 const borders=[];
 return {cells,plazas,paths,planters,benches,lamps,borders,obstacles,floor,terrainAt};
}

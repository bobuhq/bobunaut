import {createConnectedCampusLayout,CONNECTOR_WIDTH,HUB} from './connected-campus-layout.mjs';
const EPS=1e-6;
export const inside=(r,x,z,pad=0)=>x>=r.xMin-pad&&x<=r.xMax+pad&&z>=r.zMin-pad&&z<=r.zMax+pad;
export function unionPlan(rects){
 const xs=[...new Set(rects.flatMap(r=>[r.xMin,r.xMax]))].sort((a,b)=>a-b);
 const zs=[...new Set(rects.flatMap(r=>[r.zMin,r.zMax]))].sort((a,b)=>a-b);
 const cells=[],edges=[];
 const occupied=(x,z)=>rects.some(r=>inside(r,x,z));
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
  const xMin=xs[i],xMax=xs[i+1],zMin=zs[j],zMax=zs[j+1],x=(xMin+xMax)/2,z=(zMin+zMax)/2;
  if(!occupied(x,z))continue;cells.push({xMin,xMax,zMin,zMax});
  if(!occupied(xMin-EPS,z))edges.push({a:[xMin,zMin],b:[xMin,zMax]});
  if(!occupied(xMax+EPS,z))edges.push({a:[xMax,zMin],b:[xMax,zMax]});
  if(!occupied(x,zMin-EPS))edges.push({a:[xMin,zMin],b:[xMax,zMin]});
  if(!occupied(x,zMax+EPS))edges.push({a:[xMin,zMax],b:[xMax,zMax]});
 }
 return {cells,edges};
}
export const edgeObstacle=(edge,thickness=.16)=>({kind:'box',x:(edge.a[0]+edge.b[0])/2,z:(edge.a[1]+edge.b[1])/2,halfWidth:Math.max(thickness/2,Math.abs(edge.b[0]-edge.a[0])/2),halfDepth:Math.max(thickness/2,Math.abs(edge.b[1]-edge.a[1])/2)});
export function createCampusTraversal(buildings,terrainAt,hubFloor){
 const b=buildings.find(b=>b.id==='habitat');if(!b)return null;
 const s=b.plan.sites[0],research={x:b.worldX,z:b.worldZ,deck:s.deck,halfX:b.footprint.halfX,halfZ:b.footprint.halfZ};
 const links=createConnectedCampusLayout({hubFloor,research,terrainAt});
 const rear=links.filter(l=>l.id!=='hub-genesis-enclosed-link');const half=CONNECTOR_WIDTH/2;
 const rects=rear.map(l=>({xMin:Math.min(l.a[0],l.b[0])-half,xMax:Math.max(l.a[0],l.b[0])+half,zMin:Math.min(l.a[2],l.b[2])-half,zMax:Math.max(l.a[2],l.b[2])+half,link:l}));
 const union=unionPlan(rects);
 // Omit terminal end caps inside each building. Corners come from the union,
 // so neither a render wall nor a collision wall crosses a turn.
 const openEnd=e=>Math.abs(e.a[1]-e.b[1])<EPS&&(
  Math.abs(e.a[1]-rects[0].zMax)<EPS&&e.a[0]>=rects[0].xMin-EPS&&e.b[0]<=rects[0].xMax+EPS||
  Math.abs(e.a[1]-rects[2].zMax)<EPS&&e.a[0]>=rects[2].xMin-EPS&&e.b[0]<=rects[2].xMax+EPS);
 const walls=union.edges.filter(e=>!openEnd(e));
 // One station field through all three U legs. Each end of the cross-wing
 // meets its local terrain datum, avoiding an unnecessarily steep research arm.
 const cross=rects[1],rearFront=cross.zMax;
 const nodeLevel=(cx)=>{
  let level=s.deck+.4;
  for(let x=cx-half;x<=cx+half+.1;x+=.1)for(let z=cross.zMin;z<=cross.zMax+.1;z+=.1)level=Math.max(level,terrainAt(Math.min(x,cx+half),Math.min(z,cross.zMax))+.06);
  return level;
 };
 const westLevel=Math.max(hubFloor,nodeLevel(-40)),eastLevel=nodeLevel(b.worldX);
 const crossLevel=(x)=>westLevel+(eastLevel-westLevel)*Math.max(0,Math.min(1,(x+40)/(b.worldX+40)));
 const westStart=Math.max(hubFloor,terrainAt(-40,rects[0].zMax)+.055);
 const floor=(x,z)=>{
  if(!rects.some(r=>inside(r,x,z,.001)))return null;
  const rearLevel=crossLevel(x);
  let y=rearLevel;
  if(z>rearFront){
   if(x<(rects[0].xMax+rects[2].xMin)/2){
    const t=Math.max(0,Math.min(1,(z-rearFront)/(rects[0].zMax-rearFront)));y=rearLevel+(westStart-rearLevel)*t;
   }else{
    const t=Math.max(0,Math.min(1,(z-rearFront)/(rear[2].b[2]-rearFront)));y=rearLevel+(s.deck+.4-rearLevel)*t;
   }
  }
  return Math.max(y,terrainAt(x,z)+.055);
 };
 const walkable=(x,z)=>{
  const y=floor(x,z);if(y!==null)return y;
  // Original research foundation cladding has its top at deck+.4.
  if(Math.abs(x-b.worldX)<=7&&Math.abs(z-b.worldZ)<=7)return s.deck+.4;
  const front=b.worldZ+7,toe=front+3.6;
  if(Math.abs(x-b.worldX)<=2.2&&z>=front&&z<=toe){const ground=terrainAt(x,toe);return ground+(s.deck+.4-ground)*Math.max(1,Math.min(8,Math.ceil((toe-z)/.45)))/8;}
  const bridge=links[0];if(x>=bridge.a[0]&&x<=bridge.b[0]&&Math.abs(z-bridge.a[2])<=half)return bridge.a[1]+bridge.rise*(x-bridge.a[0])/bridge.length;
  return null;
 };
 const obstacles=walls.map(e=>edgeObstacle(e));
 const bridge=links[0];
 for(const side of [-1,1])obstacles.push({kind:'box',x:(bridge.a[0]+bridge.b[0])/2,z:bridge.a[2]+side*half,halfWidth:bridge.length/2+.02,halfDepth:.08});
 for(const side of [-1,1]){
  for(const dx of [3.5,5.5])obstacles.push({kind:'box',x:b.worldX+side*dx,z:b.worldZ+6.36,halfWidth:.8,halfDepth:.1});
  obstacles.push({kind:'box',x:b.worldX+side*1.65,z:b.worldZ+6.45,halfWidth:.16,halfDepth:.2});
 }
 for(const side of [-1,1])obstacles.push({kind:'circle',x:b.worldX+side*4.6,z:b.worldZ+7.7,radius:1.38});
 // Research outer facade wings/windows. Door channel stays open at x=centre.
 for(const side of [-1,1])obstacles.push({kind:'box',x:b.worldX+side*5.5,z:b.worldZ,halfWidth:1.2,halfDepth:6.0});
 // Greenhouse remains sealed, matching its retained GLB hatch and glass shell.
 const greenhouse=buildings.find(b=>b.id==='greenhouse');if(greenhouse){obstacles.push({kind:'box',x:greenhouse.worldX,z:greenhouse.worldZ,halfWidth:8.6,halfDepth:4.4});for(const side of [-1,1])obstacles.push({kind:'circle',x:greenhouse.worldX+side*6,z:greenhouse.worldZ+5.75,radius:1.5});}
 let floorCells=union.cells;
 for(const [axis,value] of [['z',rear[2].b[2]],['x',-40],['x',b.worldX]]){
  const min=axis+'Min',max=axis+'Max';floorCells=floorCells.flatMap(c=>c[min]<value&&c[max]>value?[{...c,[max]:value},{...c,[min]:value}]:[c]);
 }
 const alignedLinks=links.map((l,i)=>{
  if(!i)return l;
  const a=[l.a[0],floor(l.a[0],l.a[2]),l.a[2]],end=[l.b[0],floor(l.b[0],l.b[2]),l.b[2]],rise=end[1]-a[1];
  return {...l,a,b:end,rise,grade:Math.abs(rise/l.length)};
 });
 return {links:alignedLinks,rects,cells:floorCells,walls,floor,walkable,obstacles,research};
}
/** Collision carve for the original Hub rear wall, preserving terminal solids. */
export function hubObstaclesWithRearDoor(original){
 return original.flatMap(o=>o.kind==='box'&&Math.abs(o.x-HUB.x)<.01&&Math.abs(o.z-(HUB.z-9+.275))<.01?[
  {kind:'box',x:(-52+-41.4)/2,z:o.z,halfWidth:(-41.4+52)/2,halfDepth:o.halfDepth},
  {kind:'box',x:(-38.6+-36)/2,z:o.z,halfWidth:(-36+38.6)/2,halfDepth:o.halfDepth},
 ]:[o]);
}
export function foundationProfile(building,terrainAt){
 const s=building.plan.sites[0],w=s.width/2,d=s.depth/2,points=[];
 const edge=(ax,az,bx,bz)=>{const n=Math.ceil(Math.hypot(bx-ax,bz-az));for(let i=0;i<n;i++){const t=i/n,x=building.worldX+ax+(bx-ax)*t,z=building.worldZ+az+(bz-az)*t;points.push({x,z,bottom:terrainAt(x,z)-.06,top:s.deck});}};
 edge(-w,-d,w,-d);edge(w,-d,w,d);edge(w,d,-w,d);edge(-w,d,-w,-d);return points;
}

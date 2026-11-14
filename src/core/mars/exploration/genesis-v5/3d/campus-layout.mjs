/** Campus coordinates are station-local metres, +Z entrance, -Z Habitat.
 * Only evaluate with the host's production-terrain callback. No demo sampler. */
export const CAMPUS_ASSETS = [
 {id:'habitat',file:'habitat-dome-8d3499.glb',x:21,z:-35,width:14,depth:14,scale:1.35,height:6.75,label:'02 / HABITAT RESEARCH'},
 {id:'greenhouse',file:'greenhouse-module-0c233d.glb',x:22,z:-16,width:14,depth:9,scale:1.35,height:4.05,label:'03 / BOTANICAL SCIENCES'},
 {id:'operations',file:'command-center-e65850.glb',x:22,z:5,width:14,depth:14,scale:1.35,height:9.2611,label:'04 / AUXILIARY OPERATIONS'},
 {id:'comms',file:'comms-dish-7b129a.glb',x:19,z:-49,width:9,depth:9,scale:1.8,height:6.4078,label:'05 / DEEP SPACE RELAY'},
];
export function campusEnabled(search) { return new URLSearchParams(search).get('campus') === '1'; }
export function createCampusPlan(surface, assets = CAMPUS_ASSETS, includeLegacyPaths = true) {
 const sites=assets.map(asset=>{
  const heights=[];let slope=0;
  for(let ix=0;ix<=asset.width*2;ix++)for(let iz=0;iz<=asset.depth*2;iz++){
   const x=asset.x-asset.width/2+ix*.5,z=asset.z-asset.depth/2+iz*.5;
   const h=surface(x,z),a=surface(x+.25,z),b=surface(x-.25,z),c=surface(x,z+.25),d=surface(x,z-.25);
   if([h,a,b,c,d].some(v=>v===null||!Number.isFinite(v)))throw Error('Campus outside sampled terrain: '+asset.id);
   heights.push(h);slope=Math.max(slope,Math.atan(Math.hypot((a-b)/.5,(c-d)/.5))*180/Math.PI);
  }
  const min=Math.min(...heights),max=Math.max(...heights);
  if(max-min>1.5||slope>12)throw Error('Campus slope/relief rejected: '+asset.id);
  const deck=max+.26;
  const feet=[-1,1].flatMap(sx=>[-1,1].map(sz=>{const x=asset.x+sx*(asset.width/2-.6),z=asset.z+sz*(asset.depth/2-.6);return {x,z,ground:surface(x,z)};}));
  return {...asset,min,max,slope,deck,feet};
 });
 if(!includeLegacyPaths)return {sites,path:[],colliders:sites.map(s=>({id:'campus-'+s.id,category:'structure',xMin:s.x-s.width/2,xMax:s.x+s.width/2,zMin:s.z-s.depth/2,zMax:s.z+s.depth/2,yMin:s.min-.15,yMax:s.deck+s.height}))};
 // A surface service spine skirts the outboard edge; buildings are sealed exterior assets.
 const path=[];
 for(let z=-60;z<=22;z+=1){const y=surface(33,z);if(y===null||!Number.isFinite(y))throw Error('Campus path outside terrain');path.push({x:33,z,y});}
 for(let x=3;x<=33;x+=1){const y=surface(x,22);if(y===null||!Number.isFinite(y))throw Error('Campus approach outside terrain');path.push({x,z:22,y});}
 for(const s of sites)for(let x=s.x+s.width/2+.5;x<=33;x+=.75){const y=surface(x,s.z);if(y===null||!Number.isFinite(y))throw Error('Campus branch outside terrain');path.push({x,z:s.z,y});}
 for(const p of path){const a=surface(p.x+.25,p.z),b=surface(p.x-.25,p.z),c=surface(p.x,p.z+.25),d=surface(p.x,p.z-.25);if([a,b,c,d].some(v=>v===null||!Number.isFinite(v))||Math.atan(Math.hypot((a-b)/.5,(c-d)/.5))*180/Math.PI>12)throw Error('Campus path slope rejected');}
 return {sites,path,colliders:sites.map(s=>({id:'campus-'+s.id,category:'structure',xMin:s.x-s.width/2,xMax:s.x+s.width/2,zMin:s.z-s.depth/2,zMax:s.z+s.depth/2,yMin:s.min-.15,yMax:s.deck+s.height}))};
}
export function campusWorldObstacles(plan,placement,localToWorld){
 return plan.sites.map(s=>{const [x,z]=localToWorld(s.x,s.z,placement),swap=placement.rotationY===90||placement.rotationY===270;return {id:'campus-'+s.id,kind:'box',x,z,halfWidth:(swap?s.depth:s.width)/2,halfDepth:(swap?s.width:s.depth)/2};});
}
/** Reject occupancy conflicts before mounting any campus structure. Uses world-space
 * controller obstacles so the preview's original Hub, rocks and route stay protected. */
export function validateCampusOccupancy(plan,placement,transform,occupied){
 const boxes=campusWorldObstacles(plan,placement,transform);
 const failures=[];
 for(const b of boxes){
  if(Math.abs(b.x)+b.halfWidth>6350||Math.abs(b.z)+b.halfDepth>6350)failures.push(b.id+': outside playable terrain');
  for(const o of occupied){
   const dx=Math.max(Math.abs(b.x-o.x)-b.halfWidth-(o.kind==='box'?o.halfWidth:0),0);
   const dz=Math.max(Math.abs(b.z-o.z)-b.halfDepth-(o.kind==='box'?o.halfDepth:0),0);
   if(o.kind==='box'?dx===0&&dz===0:Math.hypot(dx,dz)<o.radius+.6)failures.push(b.id+': occupied by '+(o.id??'existing obstacle'));
  }
  for(const other of boxes)if(other!==b&&Math.abs(other.x-b.x)<other.halfWidth+b.halfWidth+1&&Math.abs(other.z-b.z)<other.halfDepth+b.halfDepth+1)failures.push(b.id+': campus overlap');
 }
 if(failures.length)throw Error(failures.join('\n'));
 return true;
}

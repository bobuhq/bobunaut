import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createCampusTraversal,foundationProfile,hubObstaclesWithRearDoor} from '../../src/core/mars/exploration/separate-v11/campus-traversal.mjs';
import {createCampusLandscape} from '../../src/core/mars/exploration/separate-v11/campus-landscape.mjs';
import {buildings,terrainAt,hubFloor,hubBase,loadTs} from './campus-fixture.mjs';
const {subtractBoxGeometry,createHubRearAperture,openResearchShell}=loadTs('src/core/mars/exploration/separate-v11/portal-geometry.ts');
const {meshWallObstacles}=loadTs('src/core/mars/exploration/separate-v11/mesh-wall-obstacles.ts');
const {surfaceGeometry}=loadTs('src/core/mars/exploration/separate-v11/WalkableCampusShell.tsx');
const {ARES_COMMAND_HUB_COLLISION_OBSTACLES:originalHub}=loadTs('src/core/mars/exploration/commandhub/AresCommandHubCollision.ts');
const model=createCampusTraversal(buildings,terrainAt,hubFloor),landscape=createCampusLandscape(buildings,terrainAt);
const research=buildings.find(b=>b.id==='habitat');
const buffer=readFileSync(new URL('../../public/mars/final-v11/campus/habitat-dome-8d3499.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const before=gltf.scene.getObjectByName('hull').geometry.getAttribute('position').array.slice();
const source=gltf.scene,scene=source.clone(true);openResearchShell(scene,1.35);
const hull=[];scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isMesh)hull.push(...meshWallObstacles(o,new THREE.Matrix4().makeTranslation(research.worldX,0,research.worldZ).multiply(new THREE.Matrix4().makeScale(1.35,1.35,1.35)).multiply(o.matrixWorld)));});
const annexes=[-1,1].map(side=>({kind:'box',x:-44+side*11.5,z:-69.6,halfWidth:4.8,halfDepth:8.5}));
const obstacles=[...model.obstacles,...hull,...hubObstaclesWithRearDoor(originalHub),...annexes,...landscape.obstacles];
const blocked=(x,z,list=obstacles)=>list.some(o=>o.kind==='box'?Math.hypot(Math.max(Math.abs(x-o.x)-o.halfWidth,0),Math.max(Math.abs(z-o.z)-o.halfDepth,0))<.48:Math.hypot(x-o.x,z-o.z)<o.radius+.48);
const ray=(geometry,origin,direction,position=[0,0,0])=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.position.set(...position);mesh.updateMatrixWorld(true);return new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction),0,30).intersectObject(mesh).length;};
test('U corridor and both doorways have a continuous full BOBU-radius route',()=>{
 for(const l of model.links){assert.ok(Math.abs(l.rise-(l.b[1]-l.a[1]))<1e-8);}
 const route=[[-40,-73.9],[-40,-93.5],[research.worldX,-93.5],[research.worldX,-82],[research.worldX,-72]];
 for(let k=1;k<route.length;k++){
  const a=route[k-1],b=route[k],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.09);let previous;
  for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
   assert.equal(blocked(x,z),false,`open route blocked at ${x.toFixed(2)},${z.toFixed(2)}`);
   const y=model.walkable(x,z);assert.notEqual(y,null);assert.ok(y>=terrainAt(x,z)-.001,'floor never buried under controller terrain');
   if(previous!==undefined)assert.ok(Math.abs(y-previous)<(z>-75?.25:.04),`no floor discontinuity at ${x},${z}`);previous=y;
  }
 }
});
test('windows, corridor sides, retained Hub walls and shell outside apertures block movement',()=>{
 for(const wall of model.walls){const x=(wall.a[0]+wall.b[0])/2,z=(wall.a[1]+wall.b[1])/2;assert.ok(blocked(x,z,model.obstacles));}
 for(const side of [-1,1])assert.ok(blocked((model.links[0].a[0]+model.links[0].b[0])/2,model.links[0].a[2]+side*1.4));
 assert.ok(blocked(research.worldX+3.5,research.worldZ+6.36),'front research glazing blocks');
 assert.ok(blocked(-44,-76.725));assert.ok(blocked(-51.7,-68));
 assert.ok(blocked(research.worldX+5.5,research.worldZ));assert.ok(blocked(research.worldX+3,research.worldZ-4));
});
test('actual research GLB has geometric front/rear apertures and retains its source cache',()=>{
 const hull=scene.getObjectByName('hull');const matrix=new THREE.Matrix4().makeScale(1.35,1.35,1.35).multiply(hull.matrixWorld);
 const transformed=hull.geometry.clone().applyMatrix4(matrix);
 assert.equal(ray(transformed,[0,1.5,-10],[0,0,1]),0,'rear door sightline continues through front door');
 assert.ok(ray(transformed,[3.3,1.5,-10],[0,0,1])>0,'solid shell remains beside door');
 assert.deepEqual(source.getObjectByName('hull').geometry.getAttribute('position').array,before);
});
test('real Hub rear wall/window aperture removes triangles while preserving adjacent wall and floor',()=>{
 const aperture=createHubRearAperture(hubBase);
 for(const g of [new THREE.BoxGeometry(15.4,4.7,.25),new THREE.PlaneGeometry(10.4,1.7)]){
  const y=g.type==='PlaneGeometry'?2.65:2.35,z=g.type==='PlaneGeometry'?-8.35:-8.55;
  const matrix=new THREE.Matrix4().makeTranslation(-44,hubBase+y,-68+z),cut=subtractBoxGeometry(g,matrix,aperture);
  assert.ok(cut);assert.equal(ray(cut,[-40,hubBase+1.6,-82],[0,0,1],[-44,hubBase+y,-68+z]),0);
  assert.ok(ray(cut,[-46,hubBase+2.4,-82],[0,0,1],[-44,hubBase+y,-68+z])>0);
 }
 const floor=new THREE.BoxGeometry(15.2,.1,17.2);
 assert.equal(subtractBoxGeometry(floor,new THREE.Matrix4().makeTranslation(-44,hubBase-.04,-68),aperture),null);
});
test('individual Genesis foundation meets terrain continuously with no support-leg dependency',()=>{
 const s=research.plan.sites[0],p=foundationProfile(research,terrainAt);
 assert.ok(Math.abs(s.deck-s.max-.06)<1e-8,'lowered to a small clearance above highest real terrain');
 assert.ok(p.length>=56);for(const point of p){assert.ok(point.bottom<terrainAt(point.x,point.z));assert.ok(point.top>terrainAt(point.x,point.z));}
 const src=readFileSync(new URL('../../src/imported-v11/core/mars/exploration/genesis-v5/FinalV11CampusAssets.tsx',import.meta.url),'utf8');
 assert.match(src,/traversable&&s.id==='habitat'\?\[\]:s.feet/);
});
test('rendered U floor triangles align with the runtime walking surface',()=>{
 const g=surfaceGeometry(model.cells,(x,z)=>model.floor(x,z)),mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
 for(const l of model.links.slice(1))for(let i=0;i<=30;i++){
  const t=i/30,x=l.a[0]+(l.b[0]-l.a[0])*t,z=l.a[2]+(l.b[2]-l.a[2])*t;
  const hits=new THREE.Raycaster(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
  assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-model.floor(x,z))<.012);
 }
});
test('landscape forms a connected exterior promenade without occupying Water or blocking its paths',()=>{
 for(const cell of landscape.cells){assert.ok(cell.xMax<=-41.8||cell.xMin>=3.2||cell.zMax<=-65.8||cell.zMin>=-20.8,'Water parcel excluded');}
 assert.notEqual(landscape.floor(-44,-57.2),null,'promenade meets original front stair toe');
 const route=[[-70,-55.5],[-44,-55.5],[-44,-17],[7,-17],[7,-71.4],[-7,-71.4]];
 for(let k=1;k<route.length;k++){const a=route[k-1],b=route[k],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*3);for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;assert.notEqual(landscape.floor(x,z),null);assert.equal(blocked(x,z,landscape.obstacles),false);}}
});

test('original Hub front entrance still reaches the rear route around preserved terminals',()=>{
 const route=[[-44,-57.1],[-44,-63],[-40,-65],[-40,-73.9]];
 for(let k=1;k<route.length;k++){const a=route[k-1],b=route[k],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.09);for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;assert.equal(blocked(x,z),false,`original entrance/terminal route blocked at ${x},${z}`);}}
});

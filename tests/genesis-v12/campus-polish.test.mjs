import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createCampusTraversal} from '../../src/core/mars/exploration/separate-v11/campus-traversal.mjs';
import {campusArchitecture} from '../../src/imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs';
import {buildings,terrainAt,hubFloor,hubBase,loadTs} from './campus-fixture.mjs';
const {createCampusExperience,DoorPassageSensor}=loadTs('src/core/mars/exploration/separate-v11/campus-experience.ts');
const {MarsCameraClearance,followCameraRadius}=loadTs('src/core/mars/exploration/components/MarsCameraClearance.ts');
const {surfaceGeometry}=loadTs('src/core/mars/exploration/separate-v11/WalkableCampusShell.tsx');
const {openResearchShell,subtractBoxGeometry,createHubRearAperture}=loadTs('src/core/mars/exploration/separate-v11/portal-geometry.ts');
const model=createCampusTraversal(buildings,terrainAt,hubFloor),experience=createCampusExperience(model,buildings,hubFloor);
const root=new THREE.Group(),scene=new THREE.Scene();scene.add(root);
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const mesh=(geometry,position=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);root.add(m);return m;};
mesh(surfaceGeometry(model.cells,(x,z)=>model.floor(x,z)));mesh(surfaceGeometry(model.cells,(x,z)=>model.floor(x,z)+3.6));
for(const e of model.walls){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),n=Math.ceil(len/1.8);for(let i=0;i<n;i++){
 const a=[e.a[0]+dx*i/n,e.a[1]+dz*i/n],b=[e.a[0]+dx*(i+1)/n,e.a[1]+dz*(i+1)/n],ya=model.floor(...a),yb=model.floor(...b);
 const m=mesh(new THREE.BoxGeometry(len/n+.025,3.6,.16),[(a[0]+b[0])/2,(ya+yb)/2+1.8,(a[1]+b[1])/2]);m.rotation.set(0,-Math.atan2(dz,dx),Math.atan2(yb-ya,len/n));
}}
for(const d of experience.doors)mesh(new THREE.BoxGeometry(3.08,.075,.18),[d.x,d.floor+3.1,d.z]);
// Actual cut research GLB and the same preserved architectural parts as runtime.
const bytes=readFileSync(new URL('../../public/mars/final-v11/campus/habitat-dome-8d3499.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');openResearchShell(gltf.scene,1.35);
const research=buildings.find(b=>b.id==='habitat');gltf.scene.position.set(research.worldX,research.plan.sites[0].deck,research.worldZ);gltf.scene.scale.setScalar(1.35);root.add(gltf.scene);
for(const p of campusArchitecture('habitat').filter(p=>!['sealed-airlock-leaf','door-window','foundation'].includes(p.name)))mesh(new THREE.BoxGeometry(...p.size),[research.worldX+p.position[0],research.plan.sites[0].deck+p.position[1],research.worldZ+p.position[2]]);
const back=new THREE.BoxGeometry(15.4,4.7,.25),matrix=new THREE.Matrix4().makeTranslation(-44,hubBase+2.35,-76.55);mesh(subtractBoxGeometry(back,matrix,createHubRearAperture(hubBase)),[-44,hubBase+2.35,-76.55]);
scene.updateMatrixWorld(true);
const clearance=new MarsCameraClearance();clearance.refresh([root]);
test('camera avoids the actual U roof, glass, turns, lintels and cut research shell at multiple mouse yaws',()=>{
 const points=[];for(const l of model.links.slice(1))for(let i=0;i<=14;i++)points.push([l.a[0]+(l.b[0]-l.a[0])*i/14,l.a[2]+(l.b[2]-l.a[2])*i/14]);
 for(const [x,z] of points)for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])for(const elevation of [.6,2,5]){
  const env=experience.environmentAt(x,z),foot=model.floor(x,z)+.09,look=new THREE.Vector3(x,foot+1.15,z);
  const eye=new THREE.Vector3(x+Math.sin(yaw)*2.6,foot+elevation,z-Math.cos(yaw)*2.6);
  const distance=clearance.solve(look,eye,env);
  assert.ok(distance>=1.5,`avoid helmet closeup at ${x},${z}, yaw ${yaw}: ${distance}`);
  const horizontal=eye.clone().sub(look);horizontal.y=0;horizontal.normalize();
  assert.ok(horizontal.dot(new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw)))>.9999,'camera safety preserves mouse yaw and movement heading');
  assert.ok(eye.y<env.ceiling-.15);assert.ok(eye.y>env.floor+.4);
  const direction=eye.clone().sub(look).normalize(),length=eye.distanceTo(look);
  const ray=new THREE.Raycaster(look,direction,.025,length-.035);
  assert.equal(ray.intersectObject(root,true).length,0,`clear view at ${x},${z}, yaw ${yaw}`);
 }
});
test('post-interpolation camera correction clears a U turn, with smooth outdoor radius restoration',()=>{
 const look=new THREE.Vector3(-39.8,model.floor(-39.8,-93.4)+1.24,-93.4),env=experience.environmentAt(-39.8,-93.4);
 const eye=new THREE.Vector3(-36,look.y+.9,-89);clearance.solve(look,eye,env);
 assert.equal(new THREE.Raycaster(look,eye.clone().sub(look).normalize(),.03,eye.distanceTo(look)-.03).intersectObject(root,true).length,0);
 let radius=2.9;const first=followCameraRadius(radius,7.43,1/60);assert.ok(first>2.9&&first<3.2);
 for(let i=0;i<180;i++)radius=followCameraRadius(radius,7.43,1/60);assert.ok(Math.abs(radius-7.43)<.01);
});
test('both rear doors open/close once per passage, remain quiet while dwelling, and work in reverse',()=>{
 for(const door of experience.doors){const sensor=new DoorPassageSensor(door),events=[];let t=0;const tick=(z,n=1)=>{for(let i=0;i<n;i++){t+=1/60;const value=sensor.update(door.x,z,t);if(value!==null)events.push(value);}};
  tick(door.z+5);tick(door.z+2);tick(door.z,600);assert.deepEqual(events,[true]);
  tick(door.z-4,60);assert.deepEqual(events,[true,false]);tick(door.z-2);tick(door.z,120);tick(door.z+4,60);assert.deepEqual(events,[true,false,true,false]);
 }
});
test('initial doorway spawn is silent and threshold jitter cannot retrigger a door',()=>{
 const sensor=new DoorPassageSensor(experience.doors[0]),d=sensor.door;
 assert.equal(sensor.update(d.x,d.z,0),null);assert.equal(sensor.open,true);
 for(let i=1;i<200;i++)assert.equal(sensor.update(d.x,d.z+(i%2?2.45:2.35),i/60),null);
});
test('Hub, U and Genesis are one interior music region; exterior courts stay outside',()=>{
 for(const [x,z] of [[-44,-65],[-40,-75],[-40,-88],[-30,-93.5],[-7,-90],[-7,-82]])assert.equal(experience.interiorAt(x,z),true);
 for(const [x,z] of [[-44,-54],[-70,-55],[-7,-70],[7,-17]])assert.equal(experience.interiorAt(x,z),false);
});
test('polish keeps original movement, campus collision and lighting contracts',()=>{
 const shell=readFileSync(new URL('../../src/core/mars/exploration/separate-v11/WalkableCampusShell.tsx',import.meta.url),'utf8');
 assert.match(shell,/rear-U-continuous-roof/);assert.match(shell,/rear-portal-slim-lintel/);assert.match(shell,/rear-U-low-blue-bounce/);assert.match(shell,/\[\.84,HEIGHT-\.15\]/);
 const world=readFileSync(new URL('../../src/core/mars/exploration/MarsExploreWorld.tsx',import.meta.url),'utf8');assert.match(world,/environmentAt=\{localCampusRuntime\?\.cameraEnvironmentAt\}/);
 const camera=readFileSync(new URL('../../src/core/mars/exploration/components/MarsFollowCamera.tsx',import.meta.url),'utf8');assert.match(camera,/orbitYaw.current -=/);assert.match(camera,/MOUSE_SENSITIVITY/);assert.match(camera,/camera.lookAt/);
});
test('camera clearance follows moving transparent door panels instead of stale closed bounds',()=>{
 const d=experience.doors[0],panels=[-1,1].map(side=>mesh(new THREE.BoxGeometry(1.3,2.68,.055),[d.x+side*.67,d.floor+1.36,d.z]));
 panels.forEach(p=>{p.material=new THREE.MeshPhysicalMaterial({transparent:true,opacity:.28});});
 const solver=new MarsCameraClearance();solver.refresh([root]);
 const look=new THREE.Vector3(d.x,d.floor+1.24,d.z-1.7),desired=new THREE.Vector3(d.x,d.floor+1.9,d.z+.8),env=experience.environmentAt(d.x,d.z-1.7);
 const closed=desired.clone(),closedLength=solver.solve(look,closed,env);
 panels.forEach((p,i)=>p.position.x=d.x+(i?1:-1)*2.07);
 const open=desired.clone(),openLength=solver.solve(look,open,env);
 assert.ok(openLength>closedLength+.25,'open glass leaves no invisible camera barrier');
 const ray=new THREE.Raycaster(look,open.clone().sub(look).normalize(),.025,openLength-.035);assert.equal(ray.intersectObject(root,true).length,0);
 panels.forEach(p=>{root.remove(p);p.geometry.dispose();p.material.dispose();});
});
test('instanced architecture uses aggregate bounds for windows and roof decorations',()=>{
 const s=new THREE.Scene(),group=new THREE.Group();s.add(group);
 const instance=new THREE.InstancedMesh(new THREE.BoxGeometry(4,3,.12),new THREE.MeshPhysicalMaterial({transparent:true,opacity:.5}),1);
 instance.setMatrixAt(0,new THREE.Matrix4().makeTranslation(10,1.7,-20));instance.instanceMatrix.needsUpdate=true;group.add(instance);s.updateMatrixWorld(true);
 const solver=new MarsCameraClearance();solver.refresh([group]);const look=new THREE.Vector3(10,1.5,-23),eye=new THREE.Vector3(10,1.9,-17);
 solver.solve(look,eye,null);assert.ok(eye.z<-20.15,'instanced window blocks the camera despite the unit-mesh origin being elsewhere');
});
test('the duplicate dark research rear header is removed while its front header and vertical frames remain',()=>{
 const text=readFileSync(new URL('../../src/core/mars/exploration/separate-v11/ConnectedCampusArchitecture.tsx',import.meta.url),'utf8');
 assert.match(text,/i===1&&<Panel at=\{\[0,3.2,0\]\} size=\{\[3.2,.18,.55\]\}/,'front-only header; rear cap is owned by U shell');
 assert.match(text,/side\*1.5,1.6,0/,'retain vertical portal structure');
 assert.match(text,/genesis-rear-open-airlock/,'retain rear opening and trim');
});

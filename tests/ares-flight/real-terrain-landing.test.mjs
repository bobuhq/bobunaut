import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import * as THREE from 'three';
import {resolveSceneObstacles} from '../../src/core/mars/exploration/flight/scene-obstacles.mjs';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import {FlightV2,emptyInput} from '../../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
import {flightTelemetry} from '../../src/core/mars/exploration/flight/flight-telemetry.mjs';
// Exercise the exact production sampler and shipped binary, not a flat mock.
const dir=mkdtempSync(join(tmpdir(),'ares-landing-'));
let terrainModule,rockModule;
try {
 buildSync({entryPoints:['src/core/mars/exploration/engine/AresGenesisTerrainData.ts'],outfile:join(dir,'terrain.cjs'),bundle:true,platform:'node',format:'cjs'});
 buildSync({stdin:{contents:readFileSync('src/core/mars/exploration/components/MarsSurfaceRocks.tsx','utf8').replace('const MARS_ROCK_DESCRIPTORS =','export const MARS_ROCK_DESCRIPTORS ='),resolveDir:resolve('src/core/mars/exploration/components'),loader:'tsx'},outfile:join(dir,'rocks.cjs'),bundle:true,platform:'node',format:'cjs'});
 rockModule=createRequire(import.meta.url)(join(dir,'rocks.cjs'));
 terrainModule=createRequire(import.meta.url)(join(dir,'terrain.cjs'));
} finally {rmSync(dir,{recursive:true,force:true});}
const binary=readFileSync(new URL('../../public/mars/ares-genesis/ares-genesis-height-16.bin',import.meta.url));
const terrain={width:256,height:256,elevations:Float32Array.from({length:65536},(_,i)=>-3836+binary.readUInt16LE(i*2)/65535*381)};
const sample=(x,z)=>terrainModule.sampleAresGenesisRenderedSurfaceMeters(terrain,x,z);
function run(f,seconds){for(let i=0;i<seconds*60;i++)f.integrate(1/60,emptyInput());}
test('real green center at 5m rejects unsafe pads, aborts G, and F recovers to settled support',()=>{
 const f=new FlightV2(sample),support=f.inspect(110,-70);
 assert.equal(support.valid,false);
 assert(support.relief>3.5);
 assert(support.slopes.every(s=>s>12));
 assert(support.tilt>13);
 f.y=support.highest+10.15; // Reported 5.0m pad clearance.
 const initial={x:f.x,y:f.y,z:f.z};
 f.beginVerticalLanding();run(f,4);
 assert.equal(f.status,'LANDING ABORTED');
 assert.equal(flightTelemetry(f).autopilot,'STANDBY');
 assert.deepEqual({x:f.x,y:f.y,z:f.z},initial);
 assert.notEqual(f.gear.state,'SETTLED');
 f.requestTouchdown();run(f,120);
 assert.equal(f.status,'LANDED');
 assert.equal(f.gear.state,'SETTLED');
 assert(f.inspect(f.x,f.z).valid);
 assert.equal(f.vy,0);
});
test('ground reservations exclude touchdown but do not invent an infinite tower on recovery route',()=>{
 const reservation={id:'building-grid',kind:'box',x:130,z:-70,halfWidth:2,halfDepth:2,groundOnly:true};
 const f=new FlightV2(()=>0,[reservation]);
 assert(!f.inspect(130,-70).valid);
 assert.notEqual(f.reachable(160,-70),null);
 const unknown=new FlightV2(()=>0,[{...reservation,groundOnly:false}]);
 assert.equal(unknown.reachable(160,-70),null);
});
test('planned transit clears protected ground using the same rule as collision substeps',()=>{
 const f=new FlightV2(()=>0);
 f.x=20;f.z=-20;f.y=10.15;
 const cruise=f.reachable(70,-20);
 assert(Number.isFinite(cruise));
 assert(cruise>10.15);
 for(let x=20;x<=70;x+=.5)assert(f.airClear(x,-20,cruise));
 assert(!f.inspect(20,-20).valid);
});
test('aborted G returns manual controls without allowing an unsafe touchdown',()=>{
 const f=new FlightV2(x=>x);
 f.beginVerticalLanding();run(f,4);
 assert.equal(f.status,'LANDING ABORTED');
 const y=f.y;
 for(let i=0;i<60;i++)f.integrate(1/60,{...emptyInput(),vertical:1});
 assert.equal(f.status,'MANUAL');
 assert(f.y>y);
 assert.notEqual(f.gear.state,'GROUND_CONTACT');
});

// This start reproduced the Firefox symptom: ground policy rejects touchdown,
// zero HUD distance, locked gear, search exhausted despite reachable support.
for(const clearance of [0,5])test(`real protected terrain: unsafe G at ${clearance}m -> F -> four-pad settlement`,()=>{
 const f=new FlightV2(sample);f.x=20;f.z=-20;f.y=f.inspect(f.x,f.z).highest+5.15+clearance;
 f.beginVerticalLanding();run(f,4);assert.equal(f.status,'LANDING ABORTED');
 f.requestTouchdown();
 let verified=false,settled=false;
 for(let i=0;i<120*60;i++){
  const before=f.y;f.integrate(1/60,emptyInput());
  const support=f.inspect(f.x,f.z),hud=flightTelemetry(f);
  assert(f.y>=support.highest+5.15-.001,'never penetrate terrain');
  if(hud.distance==='0.0'&&f.status!=='LANDED')assert.notEqual(f.phase,'HOLDING_FOR_SAFE_SITE');
  if(!support.valid&&f.target)assert(f.y>=before-.001,'failed support never descends');
  if(f.gear.state==='GROUND_CONTACT'){
   verified=true;assert.notEqual(f.status,'LANDED');assert(f.support.contactVerified);
   assert.equal(f.support.padClearances.length,4);
   for(const gap of f.support.padClearances)assert(Math.abs(gap)<=.005);
  }
  if(f.status==='LANDED'){settled=true;assert.equal(f.gear.state,'SETTLED');break;}
 }
 assert(verified);assert(settled);assert(f.support.valid);
 assert.deepEqual([f.vx,f.vy,f.vz],[0,0,0]);
});

test('real terrain abort/manual/F retry clears stale guidance and velocity',()=>{
 const f=new FlightV2(sample);f.requestTouchdown();run(f,2);
 f.toggleGear();assert.equal(f.status,'LANDING ABORTED');assert.equal(f.target,null);assert(!f.assist);
 assert.deepEqual([f.vx,f.vy,f.vz,f.yawVelocity],[0,0,0,0]);
 for(let i=0;i<60;i++)f.integrate(1/60,{...emptyInput(),vertical:1,yaw:1});
 assert.equal(f.status,'MANUAL');
 f.requestTouchdown();assert.equal(f.searchIndex,0);assert.equal(f.desiredYaw,null);assert.equal(f.support,null);
 assert.deepEqual([f.vx,f.vy,f.vz,f.yawVelocity],[0,0,0,0]);
 run(f,120);assert.equal(f.status,'LANDED');assert.equal(f.gear.state,'SETTLED');
});

test('real terrain candidate invalidation stops descent; F retries after obstruction is removed',()=>{
 const f=new FlightV2(sample);f.requestTouchdown();
 for(let i=0;i<7200&&f.phase!=='DESCEND';i++)f.integrate(1/60,emptyInput());
 assert.equal(f.phase,'DESCEND');const y=f.y;
 f.obstacles=[{kind:'circle',x:f.x,z:f.z,radius:1,topY:f.y+10}];
 f.integrate(1/60,emptyInput());assert.equal(f.status,'LANDING ABORTED');assert.equal(f.y,y);
 assert.notEqual(f.gear.state,'GROUND_CONTACT');
 f.obstacles=[];f.requestTouchdown();run(f,120);assert.equal(f.status,'LANDED');
});

test('zero HUD distance is insufficient evidence for gear contact or exit',async()=>{
 const {canDisembark}=await import('../../src/core/mars/exploration/flight/disembark-v1.mjs');
 const f=new FlightV2(sample);f.y=f.inspect(f.x,f.z).highest+5.15;
 assert.equal(flightTelemetry(f).distance,'0.0');assert(!canDisembark(f));
 f.gear.state='DESCENDING';f.gear.extension=1;
 assert(!f.gear.transition('GROUND_CONTACT',{...f.inspect(f.x,f.z),valid:true}));
 assert(!canDisembark({...f,status:'LANDED',gear:{state:'SETTLED'}}));
});

test('real verified landing unlocks cockpit, hatch, stairs and walking handoff with parked ship',async()=>{
 const {canDisembark,disembarkPhase,disembarkActorLocal,EXIT_DURATION}=await import('../../src/core/mars/exploration/flight/disembark-v1.mjs');
 const {validHandoff}=await import('../../src/core/mars/exploration/flight/handoff.mjs');
 const f=new FlightV2(sample);f.requestTouchdown();run(f,120);assert(canDisembark(f));
 const parked={ship:[f.x,f.y,f.z],yaw:f.yaw};
 assert.deepEqual([0,2.6,5.2,EXIT_DURATION].map(disembarkPhase),['COCKPIT','HATCH','STAIRS','GROUND']);
 const local=disembarkActorLocal(EXIT_DURATION),c=Math.cos(f.yaw),s=Math.sin(f.yaw);
 const x=f.x+c*local.x+s*local.z,z=f.z-s*local.x+c*local.z;
 const handoff={...parked,spawn:[x,sample(x,z),z]};
 assert(validHandoff(handoff,[],sample));
 run(f,EXIT_DURATION+1);assert(canDisembark(f));
 assert.deepEqual({ship:[f.x,f.y,f.z],yaw:f.yaw},parked);
 assert.deepEqual([f.vx,f.vy,f.vz],[0,0,0]);
});

function runtimeScene(){
 const scene=new THREE.Scene(),rocks=rockModule.MARS_ROCK_DESCRIPTORS;
 const mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial(),rocks.length),dummy=new THREE.Object3D();
 rocks.forEach((r,i)=>{
  dummy.position.set(r.x,terrainModule.sampleAresGenesisGameplaySurfaceMeters(terrain,r.x,r.z)+r.height*.36,r.z);
  dummy.rotation.set(r.rotationX,r.rotationY,r.rotationZ);dummy.scale.set(r.width,r.height,r.depth);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
 });scene.add(mesh);
 const obstacles=rockModule.MARS_SURFACE_ROCK_COLLISION_OBSTACLES.map((o,i)=>({...o,id:`surface-rock-${i}`,kind:'circle',radius:o.radius+.6}));
 // Production fixed hub, beacon and a level-one grid reservation; no server calls.
 obstacles.push({id:'original-command-hub-visual',kind:'box',x:-44,z:-68,halfWidth:8.6,halfDepth:9.6},{id:'existing-fixed-beacon',kind:'circle',x:18,z:-28,radius:1.95},{id:'progression-building-grid',kind:'box',x:-50.75,z:-74.75,halfWidth:38.25,halfDepth:38.25,groundOnly:true});
 const hub=new THREE.Mesh(new THREE.BoxGeometry(16,20,18),new THREE.MeshBasicMaterial());hub.position.set(-44,sample(-44,-68)+10,-68);scene.add(hub);
 return {scene,obstacles,mesh};
}
test('production instanced rocks reproduce F search starvation; world-instance bounds restore reachable landing',()=>{
 const {scene,obstacles,mesh}=runtimeScene();
 const unresolved=new FlightV2(sample,obstacles);
 assert.deepEqual([unresolved.x,unresolved.z],[110,-70]);
 unresolved.requestTouchdown();run(unresolved,20);
 assert.equal(unresolved.status,'LANDING ABORTED');assert.equal(unresolved.searchIndex,3200);assert.equal(unresolved.target,null);
 assert.deepEqual([unresolved.x,unresolved.z],[110,-70]);
 const resolved=resolveSceneObstacles(scene,obstacles);
 assert(resolved.filter(o=>o.id.startsWith('surface-rock-')).every(o=>Number.isFinite(o.topY)));
 const f=new FlightV2(sample,resolved);f.requestTouchdown();
 const states=new Set();let moved=false;
 for(let i=0;i<120*60&&f.status!=='LANDED';i++){f.integrate(1/60,emptyInput());states.add(f.gear.state);moved ||= Math.hypot(f.x-110,f.z+70)>1;}
 assert(moved);assert.equal(f.status,'LANDED');assert(f.support.contactVerified);
 for(const state of ['GROUND_CONTACT','COMPRESSING','SETTLED'])assert(states.has(state));
 assert(f.support.padClearances.every(v=>Math.abs(v)<=.005));
 // Each scan starts from authoritative exclusions, so changed matrices refresh topY.
 const old=resolved.find(o=>o.id==='surface-rock-0').topY;
 mesh.position.y+=30;
 assert(resolveSceneObstacles(scene,obstacles).find(o=>o.id==='surface-rock-0').topY>old+20);
 mesh.visible=false;
 assert(!Number.isFinite(resolveSceneObstacles(scene,obstacles).find(o=>o.id==='surface-rock-0').topY));
 mesh.geometry.dispose();mesh.material.dispose();
});
test('updated structure top forces route climb; unresolved new obstacle safely releases manual recovery',()=>{
 const {scene,obstacles}=runtimeScene(),f=new FlightV2(sample,resolveSceneObstacles(scene,obstacles));f.requestTouchdown();
 for(let i=0;i<1200&&!f.target;i++)f.integrate(1/60,emptyInput());assert(f.target);
 const old=f.cruise;
 const o={kind:'circle',id:'dynamic-structure',x:(f.x+f.target.x)/2,z:(f.z+f.target.z)/2,radius:3,topY:old+20};f.obstacles.push(o);run(f,2.1);
 assert(f.cruise>old+20);assert.notEqual(f.status,'LANDED');
 delete o.topY;run(f,2.1);assert.equal(f.status,'LANDING ABORTED');
 f.toggleGear();f.toggleGear();
 const y=f.y;for(let i=0;i<60;i++)f.integrate(1/60,{...emptyInput(),vertical:1});assert(f.y>y);assert.equal(f.status,'MANUAL');
});

test('manual recovery descent on real safe support verifies four pads before settlement',()=>{
 const {scene,obstacles}=runtimeScene(),resolved=resolveSceneObstacles(scene,obstacles);
 const landed=new FlightV2(sample,resolved);landed.requestTouchdown();run(landed,120);assert.equal(landed.status,'LANDED');
 const f=new FlightV2(sample,resolved);f.x=landed.x;f.z=landed.z;f.yaw=landed.yaw;f.y=f.inspect(f.x,f.z).highest+13.15;
 f.requestTouchdown();f.toggleGear();assert.equal(f.status,'LANDING ABORTED');
 const states=new Set();
 for(let i=0;i<60*20&&f.status!=='LANDED';i++){f.integrate(1/60,{...emptyInput(),vertical:-1});states.add(f.gear.state);}
 assert.equal(f.status,'LANDED');assert(f.support.contactVerified);
 for(const state of ['GROUND_CONTACT','COMPRESSING','SETTLED'])assert(states.has(state));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3} from 'three';
import {collectGenesisSourceEvidence} from '../../scripts/genesis-source-evidence.mjs';
import {INTEGRATED_LAYOUT,HUB_PLACEMENT,INTEGRATED_ASSETS,INTEGRATED_RELAYS,integratedReservations,prepareIntegratedCampus,integratedCampusFloor} from '../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
import {genesisBlockingObstacle} from '../../src/core/mars/exploration/genesis-v5/3d/production-collision-adapter.mjs';
import {constrainGenesisEye} from '../../src/core/mars/exploration/genesis-v5/3d/interior-camera.mjs';
import {FlightV2} from '../../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
const source=collectGenesisSourceEvidence({includeGeometry:true});
const input=()=>({layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),sample:source.sourceGeometry.sample,occupied:[...source.sourceGeometry.fixed,...source.sourceGeometry.observedBuildings,...source.sourceGeometry.observedMissions],legalRegions:integratedReservations(),protectedRoutes:[],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true});
test('one existing Hub; integrated assets clear actual terrain, rocks, live building and mission observations',()=>{
 const site=prepareIntegratedCampus(input());assert.equal(site.plan.sites.length,2);assert.equal(site.obstacles.some(o=>o.id?.includes('command')),false);
 assert.deepEqual(site.plan.sites.map(s=>[s.id,s.x-44,s.z-68]),[['greenhouse',-78,-72],['habitat',-23,-63]]);
 for(const s of site.plan.sites){assert(s.slope<=12);assert(s.max-s.min<=1.5);}
 const integration=readFileSync('src/core/mars/exploration/genesis-v5/AresGenesisCampusIntegration.tsx','utf8');assert(!integration.includes('GenesisSharedBaseScene'));assert(!integration.includes('<Base'));
 const world=readFileSync('src/core/mars/exploration/MarsExploreWorld.tsx','utf8');assert.equal((world.match(/<AresCommandHub\s/g)||[]).length,1);
});
test('real GLB bounds and moving relay sweep remain inside registered physical footprints',async()=>{
 for(const spec of INTEGRATED_ASSETS){const b=readFileSync('public/mars/ares-genesis/campus/'+spec.file);const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');g.scene.scale.setScalar(spec.scale);g.scene.updateMatrixWorld(true);const box=new Box3().setFromObject(g.scene);assert(box.min.x>=-spec.width/2&&box.max.x<=spec.width/2);assert(box.min.z>=-spec.depth/2&&box.max.z<=spec.depth/2);assert(box.max.y<=spec.height+1e-10);}
 const b=readFileSync('public/mars/ares-genesis/campus/comms-dish-7b129a.glb');const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');g.scene.scale.setScalar(2.15);
 for(const spec of INTEGRATED_RELAYS)for(let i=0;i<=360;i+=2){g.scene.getObjectByName('dish-azimuth').rotation.y=spec.base+Math.sin(i*Math.PI/180)*spec.amplitude;g.scene.getObjectByName('dish-elevation').rotation.x=spec.pitch+Math.cos(i*Math.PI/180)*.07;g.scene.updateMatrixWorld(true);const box=new Box3().setFromObject(g.scene);assert(Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z))<4);assert(box.max.y+4.4<13);}
});
test('occupied additions, blocked stairs, missing terrain, absent authority and parked craft reject layout',()=>{
 for(const extra of [{kind:'box',x:-78,z:-72,halfWidth:1,halfDepth:1},{kind:'circle',x:-44,z:-56,radius:1},{kind:'circle',x:-8,z:-100,radius:24}])assert.throws(()=>prepareIntegratedCampus({...input(),occupied:[...input().occupied,extra]}),/blocked/);
 assert.throws(()=>prepareIntegratedCampus({...input(),sample:()=>NaN}),/terrain/);
 assert.throws(()=>prepareIntegratedCampus({...input(),placementReserved:false}),/reservation unavailable/);
 assert.throws(()=>prepareIntegratedCampus({...input(),placement:{x:-516,z:-213,rotationY:0}}),/obsolete|layout/i);
});
test('walkable paving preserves the original Hub sampler and camera has no duplicated station walls',()=>{
 const site=prepareIntegratedCampus(input());for(const [x,z] of [[-44,-68],[-44,-59],[-44,-57.5]])assert.equal(integratedCampusFloor(site,x,z),null);
 assert.equal(integratedCampusFloor(site,-44,-50),source.sourceGeometry.sample(-44,-50)+.035);
 const eye={x:0,y:12,z:-12};constrainGenesisEye({x:0,y:12,z:0},eye,site.cameraSolids);assert.equal(eye.z,-12);
 const target=site.plan.sites[0],blocked={x:target.x,y:target.deck+1,z:target.z};constrainGenesisEye({x:target.x,y:target.deck+1,z:target.z+15},blocked,site.cameraSolids);assert(blocked.z>target.z+target.depth/2);
});
test('actual movement capsule reaches mission targets and landing side with all preserved obstacles',()=>{
 const site=prepareIntegratedCampus(input()),obstacles=[...source.sourceGeometry.fixed,...source.sourceGeometry.observedBuildings,...site.obstacles];
 const goals=[...source.sourceGeometry.observedMissions.map(m=>[m.x,m.z]),[110,-70]];const pending=new Set(goals.map((_,i)=>i));
 const queue=[[-44,-56]],seen=new Set(['-44,-56']);let index=0;
 while(index<queue.length&&pending.size){const [x,z]=queue[index++];for(const i of pending)if(Math.hypot(x-goals[i][0],z-goals[i][1])<=1.5)pending.delete(i);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(nx< -135||nx>115||nz< -110||nz>90||seen.has(key))continue;seen.add(key);
   if(genesisBlockingObstacle(nx,nz,obstacles,.48)||genesisBlockingObstacle(x+dx*.5,z+dz*.5,obstacles,.48))continue;
   if(Math.abs(source.sourceGeometry.sample(nx,nz)-source.sourceGeometry.sample(x,z))>Math.tan(12*Math.PI/180))continue;
   queue.push([nx,nz]);}
 }
 assert.equal(pending.size,0,'All four live-observed mission targets and the landing side must remain reachable');
});
test('ARES V6 landing clearance consumes integrated physical and ground-only reservations',()=>{
 const site=prepareIntegratedCampus(input()),flight=new FlightV2(source.sourceGeometry.sample,[...site.obstacles,...integratedReservations().map(r=>({...r,groundOnly:true}))]);
 assert.equal(flight.clear(-78,-72),false);assert.equal(flight.clear(-44,-50),false);assert.equal(flight.clear(110,-70),true);
 const scene=readFileSync('src/core/mars/exploration/flight/CinematicLanding.tsx','utf8');assert(!scene.includes('[flight,terrain,obstacles]'),'Lease/obstacle refresh must not restart flight');
});

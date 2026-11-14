import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sha256,liveBuildings,validateRouteGeometry,triangleSlopes} from '../../scripts/genesis-access-plan.mjs';
import {verifyOwnerProposal} from '../../scripts/genesis-verify-owner-proposal.mjs';
import {collectGenesisSourceEvidence} from '../../scripts/genesis-source-evidence.mjs';
import {prepareIntegratedCampus,integratedReservations} from '../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
import {areasOverlap} from '../../src/core/mars/exploration/genesis-v5/colony-occupancy.mjs';
import {genesisBlockingObstacle} from '../../src/core/mars/exploration/genesis-v5/3d/production-collision-adapter.mjs';
import {FlightV2} from '../../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
import {validHandoff} from '../../src/core/mars/exploration/flight/handoff.mjs';
import {disembarkActorLocal,EXIT_DURATION} from '../../src/core/mars/exploration/flight/disembark-v1.mjs';
const read=name=>JSON.parse(readFileSync('docs/genesis-v11-access-'+name+'.json','utf8'));
const p=read('proposal'),e=read('evidence'),plan=read('plan'),source=collectGenesisSourceEvidence({includeGeometry:true}),g=source.sourceGeometry;
const campus=prepareIntegratedCampus({...p.site,sample:g.sample});
const physical=[...g.fixed,...liveBuildings(p.world_snapshot),...campus.obstacles];

test('complete new-policy inventory binds actual evidence, full private snapshot and unchanged deployed geometry',()=>{
 assert.equal(sha256(readFileSync('docs/genesis-v11-access-evidence.json')),p.evidence_digest);
 assert.equal(p.inventory.evidenceArchive.content,readFileSync('docs/genesis-v11-access-evidence.json','utf8'));
 assert.equal(p.inventory.evidenceArchive.sha256,p.evidence_digest);
 assert.equal(sha256(readFileSync('docs/genesis-v11-access-plan.json')),p.inventory.accessPolicyDigest);
 assert.equal(sha256(JSON.stringify(p.world_snapshot,null,2)+'\n'),e.observation.worldSnapshotDigest);
 assert.equal(verifyOwnerProposal(p).geometryValidated,true);
 assert.deepEqual(p.site.reservations,integratedReservations());
 assert.equal(p.inventory.accessPolicyApproval,'pending');assert.equal(e.authorization.certificateIssued,false);
 assert(!JSON.stringify(e).includes(p.world_snapshot.colonies[0].leader_builder_id),'Public archive must not include account identity');
 assert(p.inventory.routes.every(r=>r.designation==='new-owner-policy'&&r.source_digest===p.inventory.accessPolicyDigest));
});
test('exact new external rectangle bounds clear every actual obstacle and all rendered terrain triangles',()=>{
 const external=p.site.protectedRoutes.filter(r=>r.id!=='hub-stair-interface');
 const result=validateRouteGeometry(external,{sample:g.sample,obstacles:physical,reservations:integratedReservations()});
 assert.equal(result.maxSlopeDegrees,plan.validation.maxSlopeDegrees);assert(result.maxSlopeDegrees<=12);
 assert.deepEqual(result,plan.validation);
 for(const r of p.site.protectedRoutes)assert(!integratedReservations().some(o=>areasOverlap(r,o)));
 const b={kind:'box',id:'test',x:1000,z:1000,halfWidth:1,halfDepth:1};
 assert.throws(()=>validateRouteGeometry([b],{sample:(x,z)=>x*.25,obstacles:[],reservations:[]}),/triangle/);
 assert.throws(()=>validateRouteGeometry([b],{sample:()=>0,obstacles:[{...b,x:1001.9}],reservations:[]}),/obstacle/);
 assert(triangleSlopes((x,z)=>x*.1+z*.1,{xMin:0,xMax:25,zMin:0,zMax:25}).every(s=>Math.abs(s-Math.atan(Math.SQRT2*.1)*180/Math.PI)<1e-8));
});
test('0.48m capsule reaches all four actual mission interaction areas and the landing interface along the designated paths',()=>{
 const missions=p.world_snapshot.mission_catalog.filter(m=>m.enabled!==false);
 assert.deepEqual(plan.paths.filter(path=>path.kind==='walking').map(path=>path.id).sort(),missions.map(m=>m.mission_key).sort());
 for(const path of plan.paths){
  assert.deepEqual(path.points[0],plan.externalInterface.point);
  assert(Math.hypot(path.points.at(-1)[0]-path.point[0],path.points.at(-1)[1]-path.point[1])<=path.radius);
  for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.1);for(let j=0;j<=n;j++)assert.equal(genesisBlockingObstacle(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,physical,.48),null);}
 }
 assert.equal(plan.entrance.validation.actualSourceCollidersValidated,true);assert.equal(plan.entrance.validation.stairCount,4);
});
test('all three 30m zones are new preservation policy distinct from observed survey radii',()=>{
 assert.equal(plan.landmarkZones.length,3);
 for(const l of p.world_snapshot.landmarks.filter(l=>l.is_active!==false)){
  const zone=plan.landmarkZones.find(z=>z.id===l.landmark_key);assert(zone);assert.equal(zone.x,l.world_x);assert.equal(zone.z,l.world_z);assert.equal(zone.radius,30);assert.equal(zone.observedSurveyRadius,4);
  assert(!integratedReservations().some(r=>areasOverlap(r,zone)));
 }
});
test('dynamic landing example meets actual V6 support and handoff, and rejects all proposed ground exclusions',()=>{
 const excluded=[...p.site.reservations,...p.site.protectedRoutes,...p.inventory.landmarkExtents,...e.observation.missions,plan.landing.progressionExclusion];
 const flightPhysical=physical.map(o=>o.kind==='circle'?{...o,radius:o.radius+.6}:o);
 const f=new FlightV2(g.sample,[...flightPhysical,...excluded.map(o=>({...o,groundOnly:true}))]);
 const {x,z}=plan.landing.center,support=f.inspect(x,z,0);assert(support.valid);assert(support.relief<=.8);assert(support.tilt<=5);assert(support.slopes.every(v=>v<=6));
 const actual=disembarkActorLocal(EXIT_DURATION);assert.equal(plan.landing.actualV6Handoff.x,x+actual.x);assert.equal(plan.landing.actualV6Handoff.z,z+actual.z);
 const spawn=plan.landing.actualV6Handoff;
 assert(validHandoff({spawn:[spawn.x,g.sample(spawn.x,spawn.z),spawn.z],ship:[x,support.highest+5.15,z],yaw:0},[...flightPhysical,plan.landing.progressionExclusion],g.sample));
 for(const o of excluded)assert.equal(f.clear(o.x,o.z),false);
 assert.equal(p.inventory.runtimeEnforcementOfNewFlightExclusions,false,'Proposed policy must not claim deployed runtime enforcement');
});

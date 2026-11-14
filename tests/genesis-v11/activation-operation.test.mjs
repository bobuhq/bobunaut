import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {approveOwnerProposal,verifyActivationInventory} from '../../scripts/genesis-activation-operation.mjs';
import {collectGenesisSourceEvidence} from '../../scripts/genesis-source-evidence.mjs';
import {prepareIntegratedCampus,integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT} from '../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';

test('fresh production-observed buildings and missions clear the unchanged 24 additions on real terrain',()=>{
 const observed=JSON.parse(readFileSync('docs/genesis-v11-activation-observation.json','utf8'));
 const {sourceGeometry:g}=collectGenesisSourceEvidence({includeGeometry:true});
 const buildings=observed.buildings.map(b=>{
  const swap=[90,270].includes(b.rotation_y),width=swap?b.depth:b.width,depth=swap?b.width:b.depth;
  return {id:b.id,kind:'box',x:-50.75+(b.grid_x+(width-1)/2)*4.5,z:-74.75+(b.grid_z+(depth-1)/2)*4.5,halfWidth:width*2.25+.6,halfDepth:depth*2.25+.6};
 });
 const missions=observed.missions.map(m=>({...m,kind:'circle'}));
 const site=prepareIntegratedCampus({layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[...g.fixed,...buildings,...missions],protectedRoutes:[],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true,sample:g.sample});
 assert.equal(site.reservations.length,24);
 // This is explicitly a known-geometry check; no external-route/landmark completeness claim.
 assert.equal(observed.counts.external_routes,0);
});

// Synthetic transport fixtures only; these are never sent to production.
function fixture(){return {id:'synthetic-proposal',release_digest:'a'.repeat(64),evidence_digest:'b'.repeat(64),evidence_uri:'https://example.invalid/evidence',valid_until:'2099-01-01T00:00:00Z',world_snapshot:{landmarks:[{landmark_key:'ridge'}]},site:{protectedRoutes:[{id:'entry',kind:'box',x:10,z:10,halfWidth:1,halfDepth:1}]},inventory:{geometryValidated:true,sourceRevision:'fixture-only',routes:[{route_key:'entry',route_kind:'entrance',source_digest:'c'.repeat(64),xMin:9,xMax:11,zMin:9,zMax:11}],landmarkExtents:[{id:'ridge',kind:'circle',x:20,z:20,radius:4}]}};}
test('reject incomplete, forged-shaped or mismatching route and landmark inventories',()=>{
 for(const mutate of [p=>p.inventory.routes=[],p=>p.inventory.routes[0].source_digest='unknown',p=>p.inventory.routes[0].xMin=Infinity,p=>p.inventory.routes[0].xMax=8,p=>p.inventory.routes.push({...p.inventory.routes[0]}),p=>p.site.protectedRoutes=[],p=>p.inventory.landmarkExtents=[],p=>p.inventory.landmarkExtents[0].radius=0]){
  const p=fixture();mutate(p);assert.throws(()=>verifyActivationInventory(p));
 }
 assert.equal(verifyActivationInventory(fixture()),true);
});
function options(p,{email='bobuuniverse@gmail.com',stored=p}={}){
 const calls=[];
 const evidenceBytes=Buffer.from('synthetic offline test evidence');p.evidence_digest=createHash('sha256').update(evidenceBytes).digest('hex');
 return {calls,evidenceBytes,key:'synthetic-key',token:'synthetic-transport-fixture',verify:()=>true,fetchImpl:async(url,init)=>{
  calls.push({url,init});const body=url.endsWith('/user')?{id:'synthetic-owner',email}:url.includes('/get_')?stored:null;
  return {ok:true,text:async()=>JSON.stringify(body)};
 }};
}
test('genuine auth endpoint identity and exact immutable proposal precede explicit decision',async()=>{
 const p=fixture(),o=options(p);const r=await approveOwnerProposal(p,o);
 assert.equal(r.ownerDecisionRecorded,true);assert.equal(r.certificateIssued,false);
 assert.equal(o.calls.length,3);assert(o.calls[0].url.endsWith('/auth/v1/user'));
 assert.deepEqual(JSON.parse(o.calls[2].init.body),{proposal:p.id,approve:true});
 assert(o.calls.every(c=>c.init.redirect==='error'));
});
test('wrong owner, absent or changed proposal, expiry and offline failure never write a decision',async()=>{
 const p=fixture();
 for(const settings of [{email:'other@example.invalid'},{stored:null},{stored:{...p,evidence_digest:'d'.repeat(64)}}]){
  const o=options(p,settings);await assert.rejects(approveOwnerProposal(p,o));assert(o.calls.length<=2);
 }
 const o=options(p);await assert.rejects(approveOwnerProposal({...p,valid_until:'2000-01-01'},o));assert.equal(o.calls.length,0);
 await assert.rejects(approveOwnerProposal(p,{...o,verify:()=>{throw Error('geometry failed');}}));assert.equal(o.calls.length,0);
});
test('server failures do not disclose response bodies or tokens',async()=>{
 const p=fixture(),o=options(p);o.fetchImpl=async()=>({ok:false,status:401,text:async()=>o.token});
 await assert.rejects(approveOwnerProposal(p,o),e=>e.message.includes('HTTP 401')&&!e.message.includes(o.token));
});
test('missing or changed evidence archive prevents every network operation',async()=>{
 const p=fixture(),o=options(p);
 for(const evidenceBytes of [undefined,Buffer.from('altered')])await assert.rejects(approveOwnerProposal(p,{...o,evidenceBytes}),/archive/);
 assert.equal(o.calls.length,0);
});

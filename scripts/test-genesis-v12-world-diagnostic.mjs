import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';

// Synthetic fixture ONLY. Isolated local Docker database. Never calls hosted Supabase.
const container=process.env.GENESIS_TEST_CONTAINER||'supabase_db_BOBU-Universe-v0.2.1-Cinematic-Edition';
const database=`bobu_v12_behavior_${Date.now()}_${process.pid}`;
assert.match(database,/^bobu_v12_behavior_\d+_\d+$/);
function sql(command,db=database){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db]);
 let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 child.on('error',reject);child.on('close',code=>code===0?resolve(stdout.trim()):reject(Error(stderr||stdout)));
 child.stdin.on('error',()=>{});child.stdin.end(command);
});}
const json=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const owner='00000000-0000-0000-0000-000000000003';
const outsider='00000000-0000-0000-0000-000000000009';
const proposal='00000000-0000-0000-0000-000000000010';
const colony='00000000-0000-0000-0000-000000000001';
const release='8080335c3f9ac55e40f64b1c4acdde0693eb5038ee74e0017ddc29a0a995156f';
const evidence='b'.repeat(64);
const uri='https://evidence.example.invalid/immutable/'+evidence+'.json';
const route={route_key:'synthetic-route',route_kind:'walking',xMin:999,xMax:1001,zMin:999,zMax:1001,source_digest:'d'.repeat(64)};
const inventory={completeWorldCoverage:true,externalRoutesComplete:true,geometryValidated:true,landmarkExtentsVerified:true,mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},sourceRevision:'synthetic-v12-fixture',terrainDigest:'c'.repeat(64),routes:[route],landmarkExtents:[{id:'synthetic-1'},{id:'synthetic-2'},{id:'synthetic-3'}]};
const site={ownerProposalId:proposal,layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[{kind:'box',x:-44,z:-68,halfWidth:9.6,halfDepth:9.6}],protectedRoutes:[{id:'synthetic-route',kind:'box',x:1000,z:1000,halfWidth:1,halfDepth:1}],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true};
const auth=user=>`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`;
let created=false;
try{
 await sql(`create database ${database}`,'postgres');created=true;
 const fixture=readFileSync('tests/genesis-v11/fixture.sql','utf8').replace(/create role anon; create role authenticated; create role service_role bypassrls;/,'');
 const chain=['supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','tests/genesis-v11/legacy-authority-fixture.sql','supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql','supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql','supabase/migrations/20261117230000_genesis_v12_persistent_authorization.sql'];
 await sql(fixture+chain.map(f=>readFileSync(f,'utf8')).join('\n'));
 await sql(`insert into genesis_v11.owners values('${owner}');insert into genesis_v11.proposals(id,colony_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,valid_until) values('${proposal}','${colony}','${release}','${evidence}','${uri}',public.ares_genesis_world_snapshot_v11(),${json(site)},${json(inventory)},statement_timestamp()+interval '20 minutes');`);
 await assert.rejects(sql(`${auth(outsider)}select public.activate_ares_genesis_persistent_v12('${proposal}')`),/BOBU_OWNER_REQUIRED/);
 await assert.rejects(sql(`${auth(owner)}select public.activate_ares_genesis_persistent_v12('${proposal}')`),/EXPLICIT_MATCHING_OWNER_APPROVAL_REQUIRED/);
 await sql(`${auth(owner)}select public.decide_ares_genesis_owner_proposal_v11('${proposal}',true);`);
 await assert.rejects(sql(`${auth(owner)}select public.activate_ares_genesis_persistent_v12('${proposal}')`),/IMMUTABLE_EVIDENCE_NOT_VERIFIED/);
 await sql(`insert into genesis_v11.verified_evidence_v12(evidence_digest,evidence_uri,release_digest) values('${evidence}','${uri}','${release}');`);
 const grant=(await sql(`${auth(owner)}select public.activate_ares_genesis_persistent_v12('${proposal}')`)).split('\n').at(-1);
 assert.match(grant,/^[a-f0-9-]{36}$/);
 assert.equal((await sql(`${auth(owner)}select public.get_ares_genesis_placement_v10()->>'status';`)).split('\n').at(-1),'approved');
 const values=JSON.parse((await sql(`${auth(owner)}select public.get_ares_genesis_placement_v10()::text;`)).split('\n').at(-1));
 assert.equal(values.revision,grant);assert.equal(values.release_digest,release);
 const t=Date.parse(values.server_time),exp=Date.parse(values.expires_at),issued=Date.parse(values.issued_at);
 assert.ok(Math.abs(exp-t-60000)<1000,'lease is precisely 60 seconds');assert.ok(Math.abs(issued-t)<1000,'lease starts at server time');
 await assert.rejects(sql(`update public.mars_colony_buildings set grid_x=-6,grid_z=1 where id='00000000-0000-0000-0000-000000000002';`),/ARES_GENESIS_RESERVED/);
 assert.equal(await sql(`select grid_x from public.mars_colony_buildings where id='00000000-0000-0000-0000-000000000002';`),'0');

 // Diagnostics: a *non-conflicting* world mutation currently invalidates the persistent grant.
 // This is a shipping blocker for the promised always-on behavior, not a test fixture error.
 await sql(`update public.mars_colony_buildings set grid_x=30,grid_z=30 where id='00000000-0000-0000-0000-000000000002';`);
 const changed=(await sql(`${auth(owner)}select public.get_ares_genesis_placement_v10()->>'status';`)).split('\n').at(-1);
 assert.equal(changed,'blocked','World change must fail closed');
 await sql(`update public.mars_colony_buildings set grid_x=0,grid_z=0 where id='00000000-0000-0000-0000-000000000002';`);
 const restored=(await sql(`${auth(owner)}select public.get_ares_genesis_placement_v10()->>'status';`)).split('\n').at(-1);
 console.log(`V12_WORLD_DIAGNOSTIC: safe_mutation=${changed}; restored_world=${restored}`);
 if(restored==='approved') console.log('V12_SECURITY_BLOCKER: ABA restore can re-enable a grant unless a monotonic epoch invalidates it. DO NOT DEPLOY.');
 if(changed==='blocked') console.log('V12_AVAILABILITY_BLOCKER: even a non-overlapping building move disables the persistent grant. DO NOT DEPLOY.');
 await assert.rejects(sql(`${auth(outsider)}select public.withdraw_ares_genesis_persistent_v12('${proposal}');`),/BOBU_OWNER_REQUIRED/);
 await sql(`${auth(owner)}select public.withdraw_ares_genesis_persistent_v12('${proposal}');`);
 assert.equal((await sql(`${auth(owner)}select public.get_ares_genesis_placement_v10()->>'status';`)).split('\n').at(-1),'blocked');
 await assert.rejects(sql(`${auth(owner)}select public.activate_ares_genesis_persistent_v12('${proposal}')`),/duplicate key|unique constraint/i);
 console.log('V12_PERSISTENT_BEHAVIOR_PASS: genuine owner decision, verified evidence gate, 60s lease, live reserved building guard, outsider denial, irrevocable audit and owner revocation');
 console.log('NOTE: synthetic data only; this test does not validate real evidence provenance, all world changes or production activation.');
}finally{if(created) await sql(`drop database ${database}`,'postgres');}

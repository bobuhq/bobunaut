import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';

// Runs on isolated local Docker PostgreSQL, never on hosted Supabase.
const container=process.env.GENESIS_TEST_CONTAINER||'supabase_db_BOBU-Universe-v0.2.1-Cinematic-Edition';
const database=`bobu_v13_world_${Date.now()}_${process.pid}`;
assert.match(database,/^bobu_v13_world_\d+_\d+$/);
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
const evidence='b'.repeat(64),uri='https://evidence.example.invalid/immutable/'+evidence+'.json';
const route={route_key:'synthetic-route',route_kind:'walking',xMin:999,xMax:1001,zMin:999,zMax:1001,source_digest:'d'.repeat(64)};
const inventory={completeWorldCoverage:true,externalRoutesComplete:true,geometryValidated:true,landmarkExtentsVerified:true,mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},sourceRevision:'synthetic-v13-fixture',terrainDigest:'c'.repeat(64),routes:[route],landmarkExtents:[{id:'synthetic-1'},{id:'synthetic-2'},{id:'synthetic-3'}]};
const site={ownerProposalId:proposal,layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[{kind:'box',x:-44,z:-68,halfWidth:9.6,halfDepth:9.6}],protectedRoutes:[{id:'synthetic-route',kind:'box',x:1000,z:1000,halfWidth:1,halfDepth:1}],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true};
const auth=user=>`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`;
const status=async user=>(await sql(`${auth(user)}select public.get_ares_genesis_world_site_v13()->>'status';`)).split('\n').at(-1);
let created=false;
try{
 await sql(`create database ${database}`,'postgres');created=true;
 const fixture=readFileSync('tests/genesis-v11/fixture.sql','utf8').replace(/create role anon; create role authenticated; create role service_role bypassrls;/,'');
 const chain=['supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','tests/genesis-v11/legacy-authority-fixture.sql','supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql','supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql','supabase/migrations/20261117230000_genesis_v12_persistent_authorization.sql','supabase/migrations/20261117233000_genesis_v12_scoped_authority_epoch.sql','supabase/migrations/20261118001000_genesis_v13_durable_world_registry.sql'];
 await sql(fixture+chain.map(f=>readFileSync(f,'utf8')).join('\n'));
 await sql(`insert into genesis_v11.owners values('${owner}');insert into genesis_v11.proposals(id,colony_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,valid_until) values('${proposal}','${colony}','${release}','${evidence}','${uri}',public.ares_genesis_world_snapshot_v11(),${json(site)},${json(inventory)},statement_timestamp()+interval '20 minutes');`);
 assert.equal(await status(owner),'unregistered','Never-authorized world must remain legacy-compatible');
 await assert.rejects(sql(`${auth(outsider)}select public.register_ares_genesis_world_site_v13('${proposal}');`),/MATCHING_OWNER_GRANT_REQUIRED/);
 await assert.rejects(sql(`${auth(owner)}select public.register_ares_genesis_world_site_v13('${proposal}');`),/MATCHING_OWNER_GRANT_REQUIRED/);
 await sql(`${auth(owner)}select public.decide_ares_genesis_owner_proposal_v11('${proposal}',true);`);
 await sql(`insert into genesis_v11.verified_evidence_v12(evidence_digest,evidence_uri,release_digest) values('${evidence}','${uri}','${release}');`);
 await sql(`${auth(owner)}select public.activate_ares_genesis_persistent_v12('${proposal}');`);
 const id=(await sql(`${auth(owner)}select public.register_ares_genesis_world_site_v13('${proposal}');`)).split('\n').at(-1);
 assert.match(id,/^[a-f0-9-]{36}$/);
 assert.equal(await status(owner),'registered');
 await assert.rejects(sql('set role anon;select public.get_ares_genesis_world_site_v13()'),/permission denied/);
 // Non-overlapping move never revokes a durable world record.
 await sql(`update public.mars_colony_buildings set grid_x=30,grid_z=30 where id='00000000-0000-0000-0000-000000000002';`);
 assert.equal(await status(owner),'registered');
 await sql(`update public.mars_colony_buildings set grid_x=0,grid_z=0 where id='00000000-0000-0000-0000-000000000002';`);
 assert.equal(await status(owner),'registered');
 await assert.rejects(sql(`update public.mars_colony_buildings set grid_x=-6,grid_z=1 where id='00000000-0000-0000-0000-000000000002';`),/ARES_GENESIS_RESERVED/);
 // Reversible owner record edits MUST NOT restore an invalidated site (ABA).
 await sql(`update genesis_v11.owners set enabled=false where user_id='${owner}';`);
 assert.equal(await status(owner),'blocked');
 await sql(`update genesis_v11.owners set enabled=true where user_id='${owner}';`);
 assert.equal(await status(owner),'blocked');
 // Audit row persists but old authority remains blocked.
 assert.equal(await sql('select count(*) from genesis_v11.world_sites_v13'),'1');
 await assert.rejects(sql(`${auth(outsider)}select public.disable_ares_genesis_world_site_v13('${proposal}');`),/BOBU_OWNER_REQUIRED/);
 await sql(`${auth(owner)}select public.disable_ares_genesis_world_site_v13('${proposal}');`);
 assert.equal(await status(owner),'blocked');
 assert.equal(await sql('select count(*) from genesis_v11.world_sites_v13 where disabled_at is not null'),'1');
 console.log('V13_WORLD_REGISTRY_PASS: owner-only registration, stable durable row, safe external building changes, reserved collision, authority ABA denial, anonymous denial, permanent disable and audit retention');
 console.log('NOTE: synthetic fixtures only. Do not deploy without concurrency tests, real evidence provenance and authenticated browser verification.');
}finally{if(created)await sql(`drop database ${database}`,'postgres');}

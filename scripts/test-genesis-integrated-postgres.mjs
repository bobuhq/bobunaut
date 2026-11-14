import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
// Synthetic regression on a temporary LOCAL database only. Never a hosted URL.
const container=process.env.GENESIS_TEST_CONTAINER||'supabase_db_BOBU-Universe-v0.2.1-Cinematic-Edition';
const database=`bobu_genesis_v11_integrated_${Date.now()}_${process.pid}`;
assert.match(database,/^bobu_genesis_v11_integrated_[0-9]+_[0-9]+$/);
function sql(statement,db=database){return new Promise((resolve,reject)=>{const child=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db]);let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(Error(err)));child.stdin.on('error',()=>{});child.stdin.end(statement);});}
const json=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
let created=false;
try{
 await sql(`create database ${database}`,'postgres');created=true;
 const fixture=readFileSync('tests/genesis-v11/fixture.sql','utf8').replace(/create role anon; create role authenticated; create role service_role bypassrls;/,'');
 await sql(fixture+readFileSync('supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','utf8')+readFileSync('tests/genesis-v11/legacy-authority-fixture.sql','utf8')+readFileSync('supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql','utf8')+readFileSync('supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql','utf8'));
 const id='00000000-0000-0000-0000-000000000010',owner='00000000-0000-0000-0000-000000000003';
 const site={ownerProposalId:id,layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[{kind:'box',x:-44,z:-68,halfWidth:9.6,halfDepth:9.6}],protectedRoutes:[{id:'fixture',kind:'box',x:1000,z:1000,halfWidth:1,halfDepth:1}],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true};
 const inventory={completeWorldCoverage:true,externalRoutesComplete:true,geometryValidated:true,landmarkExtentsVerified:true,mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},sourceRevision:'synthetic-fixture',terrainDigest:'c'.repeat(64),routes:[{route_key:'fixture',route_kind:'walking',xMin:999,xMax:1001,zMin:999,zMax:1001,source_digest:'d'.repeat(64)}]};
 await sql(`insert into genesis_v11.owners values('${owner}'); set role service_role;
 insert into genesis_v11.proposals(id,colony_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,valid_until) values('${id}','00000000-0000-0000-0000-000000000001',repeat('a',64),repeat('b',64),'https://example.invalid/synthetic-integrated-evidence',public.ares_genesis_world_snapshot_v11(),${json(site)},${json(inventory)},statement_timestamp()+interval '5 minutes');`);
 const issue=`set role service_role;select public.issue_ares_genesis_owner_certificate_v11('${id}')`;
 await assert.rejects(sql(issue),/BOBU_OWNER_APPROVAL_REQUIRED/);
 await sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.decide_ares_genesis_owner_proposal_v11('${id}',true);`);
 const attempts=await Promise.allSettled(Array.from({length:4},()=>sql(issue)));
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1,'one concurrent integrated owner issuer succeeds');
 for(const x of attempts.filter(x=>x.status==='rejected'))assert.match(x.reason.message,/already issued/);
 assert.match(await sql(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select public.get_ares_genesis_placement_v10()->>'status';`),/approved$/);
 await assert.rejects(sql('update public.mars_colony_buildings set grid_x=-7,grid_z=0'),/ARES_GENESIS_RESERVED/);
 assert.equal(await sql('select grid_x from public.mars_colony_buildings'),'0');
 assert.equal(await sql('select count(*) from genesis_v11.integrated_allocations'),'1');
 await assert.rejects(sql('set role anon;select public.get_ares_genesis_placement_v10()'),/permission denied/);
 console.log('INTEGRATED_POSTGRES_PASS: complete migration chain, genuine SQL roles in isolated fixture, four concurrent issuers, approved authenticated fixture RPC, protected original Hub, collision reservation and anonymous denial');
}finally{if(created)await sql(`drop database ${database}`,'postgres');}

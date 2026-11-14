import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
// Only the local Docker socket; never a hosted URL or the player's database.
const container=process.env.GENESIS_TEST_CONTAINER || 'supabase_db_BOBU-Universe-v0.2.1-Cinematic-Edition';
const database=`bobu_genesis_v11_test_${Date.now()}_${process.pid}`;
assert.match(database,/^bobu_genesis_v11_test_[0-9]+_[0-9]+$/);
function sql(statement,db=database){
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db]);
  let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
  child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(Error(err)));
  child.stdin.on('error',()=>{});child.stdin.end(statement);
 });
}
let created=false;
try{
 await sql(`create database ${database}`,'postgres');created=true;
 const fixture=readFileSync('tests/genesis-v11/fixture.sql','utf8').replace(/create role anon; create role authenticated; create role service_role bypassrls;/,'');
 await sql(fixture+readFileSync('supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','utf8'));
 const site={placement:{x:-516,z:-213,rotationY:0},occupancyComplete:true,routesReserved:true,placementReserved:true,occupied:[],protectedRoutes:[],reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:100,halfDepth:100}]};
 // Synthetic certificate stays inside this temporary database only.
 const issue=`set role service_role; insert into public.ares_genesis_certificates_v11(colony_id,release_digest,evidence_digest,evidence_uri,expires_at,world_snapshot,site) values ('00000000-0000-0000-0000-000000000001',repeat('a',64),repeat('b',64),'https://example.invalid/synthetic-fixture',statement_timestamp()+interval '5 minutes',public.ares_genesis_world_snapshot_v11(),'${JSON.stringify(site)}'::jsonb);`;
 const attempts=await Promise.allSettled(Array.from({length:4},()=>sql(issue)));
 assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1,'exactly one concurrent certificate issuer succeeds');
 for(const failure of attempts.filter(a=>a.status==='rejected'))assert.match(failure.reason.message,/unique constraint/);
 const review="set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false); select public.get_ares_genesis_placement_v10()->>'status';";
 assert.match(await sql(review),/approved$/);
 for(const role of ['anon','authenticated','service_role']){
  await assert.rejects(sql(`set role ${role}; delete from public.ares_genesis_certificates_v11`),/permission denied/);
  await assert.rejects(sql(`set role ${role}; truncate public.ares_genesis_certificates_v11`),/permission denied/);
 }
 await assert.rejects(sql('update public.mars_colony_buildings set grid_x=-108,grid_z=-32'),/ARES_GENESIS_RESERVED/);
 await sql('update public.mars_colony_buildings set grid_x=1; update public.mars_colony_buildings set grid_x=0');
 assert.match(await sql(review),/blocked$/);
 await sql("set role service_role; update public.ares_genesis_certificates_v11 set revoked_at=statement_timestamp()-interval '1 year'");
 await assert.rejects(sql('update public.mars_colony_buildings set grid_x=-108,grid_z=-32'),/ARES_GENESIS_RESERVED/);
 assert.equal(await sql('select grid_x from public.mars_colony_buildings'),'0');
 console.log('GENESIS_POSTGRES_PASS: concurrent issuance, role restrictions, conflict reservation, ABA invalidation, server-owned revocation and preserved building rows');
}finally{
 if(created)await sql(`drop database ${database}`,'postgres');
}

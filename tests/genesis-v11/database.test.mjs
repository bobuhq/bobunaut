import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('certification migration enforces auth, service ownership, freshness, revocation and data preservation',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 grant execute on function auth.uid() to authenticated;
 create table public.mars_colonies(id uuid primary key, name text);
 create table public.mars_building_definitions(building_key text primary key, footprint_width int, footprint_depth int);
 create table public.mars_colony_buildings(id uuid primary key, colony_id uuid, building_key text, grid_x int, grid_z int default 0, rotation_y int default 0, status text default 'active');
 create table public.mars_colony_memberships(builder_id uuid, colony_id uuid, status text);
 insert into public.mars_colonies values ('00000000-0000-0000-0000-000000000001','Preserved colony');
 insert into public.mars_building_definitions values ('command_hub',4,4);
 insert into public.mars_colony_buildings(id,colony_id,building_key,grid_x) values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','command_hub',0);
 insert into public.mars_colony_memberships values ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','active');
 `);
 const snapshot=async()=>(await db.query('select public.ares_genesis_world_snapshot_v11() as value')).rows[0].value;
 const before=(await db.query('select * from public.mars_colony_buildings')).rows;
 await db.exec(readFileSync('supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','utf8'));
 assert.deepEqual((await db.query('select * from public.mars_colony_buildings')).rows,before);
 await assert.rejects(db.query('select public.get_ares_genesis_placement_v10()'),/AUTH_REQUIRED/);
 await db.exec("set role anon");
 await assert.rejects(db.query('select public.get_ares_genesis_placement_v10()'),/permission denied/);
 await db.exec("reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false)");
 const review=async()=>(await db.query('select public.get_ares_genesis_placement_v10() as value')).rows[0].value;
 assert.equal((await review()).status,'blocked');
 await assert.rejects(db.query('select * from public.ares_genesis_certificates_v11'),/permission denied/);
 await assert.rejects(db.query('select public.ares_genesis_world_snapshot_v11()'),/permission denied/);
 await assert.rejects(db.query('insert into public.ares_genesis_certificates_v11 default values'),/permission denied/);
 await db.exec('reset role');
 const world=await snapshot();
 const site={placement:{x:-516,z:-213,rotationY:0},occupancyComplete:true,routesReserved:true,placementReserved:true,occupied:[],protectedRoutes:[],reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:100,halfDepth:100}]};
 // Isolated synthetic DB fixture, never exported as production evidence.
 const issue=async(state=world,geometry=site,lease="interval '5 minutes'")=>db.query(`insert into public.ares_genesis_certificates_v11(colony_id,release_digest,evidence_digest,evidence_uri,expires_at,world_snapshot,site) values ('00000000-0000-0000-0000-000000000001',$1,$2,'https://example.invalid/synthetic-fixture',statement_timestamp()+${lease},$3,$4) returning revision`,['a'.repeat(64),'b'.repeat(64),JSON.stringify(state),JSON.stringify(geometry)]);
 await assert.rejects(issue({}),/snapshot/);
 await assert.rejects(issue(world,site,"interval '25 hours'"),/check constraint/);
 const missing={...site};delete missing.protectedRoutes;
 await assert.rejects(issue(world,missing),/check constraint/);
 await db.exec('set role service_role');
 await issue();
 await db.exec('reset role; set role authenticated');
 assert.equal((await review()).status,'approved');
 await assert.rejects(db.exec('reset role; update public.mars_building_definitions set footprint_width=5'),/ARES_GENESIS_RESERVED/);
 await db.exec('set role authenticated');
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false)");
 assert.equal((await review()).status,'blocked');
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false); reset role");
 await assert.rejects(issue(),/unique constraint/);
 await assert.rejects(db.exec("update public.ares_genesis_certificates_v11 set evidence_digest=repeat('c',64)"),/immutable/);
 await assert.rejects(db.exec('update public.mars_colony_buildings set grid_x=-108,grid_z=-32'),/ARES_GENESIS_RESERVED/);
 await db.exec('update public.mars_colony_buildings set grid_x=1');
 assert.equal((await review()).status,'blocked');
 await db.exec('update public.mars_colony_buildings set grid_x=0');
 assert.equal((await review()).status,'blocked','ABA world changes must remain blocked');
 await db.exec('update public.ares_genesis_certificates_v11 set revoked_at=statement_timestamp()');
 assert.equal((await review()).status,'blocked');
 await assert.rejects(db.exec('update public.mars_colony_buildings set grid_x=-108,grid_z=-32'),/ARES_GENESIS_RESERVED/);
 await assert.rejects(db.exec('update public.ares_genesis_certificates_v11 set revoked_at=null'),/immutable/);
 await assert.rejects(issue(await snapshot(),site,"interval '20 seconds'"),/lease invalid/);
 await db.exec('begin; delete from public.ares_genesis_certificates_v11; update public.mars_colony_buildings set grid_x=-108,grid_z=-32');
 await assert.rejects(issue(await snapshot()),/live building occupancy/);
 await db.exec('rollback');
 assert.deepEqual((await db.query('select * from public.mars_colony_buildings')).rows,before);
 } finally {await db.close();}
});

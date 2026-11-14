import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT} from '../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
import {collectGenesisSourceEvidence} from '../../scripts/genesis-source-evidence.mjs';
import {validateGenesisCertificate} from '../../src/core/mars/exploration/genesis-v5/certification.mjs';
const migration='supabase/migrations/20261114193344_ares_integrated_command_hub_v11.sql';
test('exact migration chain rejects distant authority and issues/renews integrated owner certificates while preserving Hub and player buildings',async()=>{
 const db=new PGlite();try{
 await db.exec(readFileSync('tests/genesis-v11/fixture.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','utf8'));
 await db.exec(readFileSync('tests/genesis-v11/legacy-authority-fixture.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql','utf8'));
 await db.exec(readFileSync(migration,'utf8'));
 assert.deepEqual((await db.query('select genesis_v11.integrated_reservations() as r')).rows[0].r,integratedReservations(),'Server and client regions must be identical');
 await db.exec(`insert into public.mars_building_definitions values('habitat',3,3),('water',3,3);
 insert into public.mars_colony_buildings values('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','habitat',0,-3,180,'active'),('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','water',6,6,90,'active');`);
 const before=(await db.query('select * from public.mars_colony_buildings order by id')).rows;
 assert.equal((await db.query('select public.ares_genesis_building_conflicts_v11(0,0,0,4,4) as c')).rows[0].c,false);
 const owner='00000000-0000-0000-0000-000000000003',id='00000000-0000-0000-0000-000000000010',renew='00000000-0000-0000-0000-000000000011';
 await db.exec(`insert into genesis_v11.owners values('${owner}');`);
 const snapshot=async()=>(await db.query('select public.ares_genesis_world_snapshot_v11() as w')).rows[0].w;
 const site={ownerProposalId:id,layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[...collectGenesisSourceEvidence({includeGeometry:true}).sourceGeometry.fixed,{kind:'box',x:-44,z:-68,halfWidth:9.6,halfDepth:9.6},{kind:'box',x:-46.25,z:-83.75,halfWidth:7.35,halfDepth:7.35},{kind:'box',x:-19.25,z:-43.25,halfWidth:7.35,halfDepth:7.35}],protectedRoutes:[{id:'fixture-route',kind:'box',x:1000,z:1000,halfWidth:1,halfDepth:1}],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true};
 const inventory={completeWorldCoverage:true,externalRoutesComplete:true,geometryValidated:true,landmarkExtentsVerified:true,mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},sourceRevision:'synthetic-fixture',terrainDigest:'c'.repeat(64),routes:[{route_key:'fixture-route',route_kind:'walking',xMin:999,xMax:1001,zMin:999,zMax:1001,source_digest:'d'.repeat(64)}]};
 const propose=async(pid,s)=>db.query(`insert into genesis_v11.proposals(id,colony_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,valid_until) values($1,'00000000-0000-0000-0000-000000000001',$2,$3,'https://example.invalid/synthetic-integrated-evidence',$4,$5,$6,statement_timestamp()+interval '5 minutes')`,[pid,'a'.repeat(64),'b'.repeat(64),JSON.stringify(await snapshot()),JSON.stringify(s),JSON.stringify(inventory)]);
 await assert.rejects(propose(id,{...site,placement:{x:-516,z:-213,rotationY:0}}),/OBSOLETE|INVALID/);
 await propose(id,site);
 await db.exec('set role service_role');await assert.rejects(db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[id]),/OWNER_APPROVAL/);
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`);
 await db.query('select public.decide_ares_genesis_owner_proposal_v11($1,true)',[id]);
 await db.exec('set role service_role');await db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[id]);
 await db.exec('set role authenticated');
 const result=(await db.query('select public.get_ares_genesis_placement_v10() as r')).rows[0].r;
 validateGenesisCertificate(result,{colonyId:'00000000-0000-0000-0000-000000000001',releaseDigest:'a'.repeat(64)});
 await db.exec('reset role');
 await assert.rejects(db.exec('update public.mars_colony_buildings set grid_x=-7,grid_z=0 where building_key=\'water\''),/ARES_GENESIS_RESERVED/);
 await propose(renew,{...site,ownerProposalId:renew});
 await db.exec('set role authenticated');await db.query('select public.decide_ares_genesis_owner_proposal_v11($1,true)',[renew]);
 await db.exec('set role service_role');await db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[renew]);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int as n from genesis_v11.integrated_allocations')).rows[0].n,2);
 assert.deepEqual((await db.query('select * from public.mars_colony_buildings order by id')).rows,before);
 await db.exec('set role anon');await assert.rejects(db.query('select public.get_ares_genesis_placement_v10()'),/permission denied/);
 await db.exec('reset role;set role authenticated');await db.query('select public.withdraw_ares_genesis_owner_certificate_v11($1)',[renew]);
 assert.equal((await db.query('select public.get_ares_genesis_placement_v10() as r')).rows[0].r.status,'blocked');
 }finally{await db.close();}
});

test('topology migration refuses to free an obsolete allocation with a live browser lease',async()=>{
 const db=new PGlite();try{
 await db.exec(readFileSync('tests/genesis-v11/fixture.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','utf8'));
 const oldSite={placement:{x:-516,z:-213,rotationY:0},occupancyComplete:true,routesReserved:true,placementReserved:true,occupied:[],protectedRoutes:[],reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:100,halfDepth:100}]};
 await db.query(`insert into public.ares_genesis_certificates_v11(colony_id,release_digest,evidence_digest,evidence_uri,expires_at,world_snapshot,site) values('00000000-0000-0000-0000-000000000001',repeat('a',64),repeat('b',64),'https://example.invalid/synthetic-legacy-evidence',statement_timestamp()+interval '5 minutes',public.ares_genesis_world_snapshot_v11(),$1)`,[JSON.stringify(oldSite)]);
 await db.exec(readFileSync('tests/genesis-v11/legacy-authority-fixture.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql','utf8'));
 await assert.rejects(db.exec(readFileSync(migration,'utf8')),/drain leases/);
 await db.exec('rollback');
 assert.equal((await db.query('select public.ares_genesis_building_conflicts_v11(-108,-32,0,1,1) as c')).rows[0].c,true,'Failed topology migration leaves obsolete protection intact');
 }finally{await db.close();}
});

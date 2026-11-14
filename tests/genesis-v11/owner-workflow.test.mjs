import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {buildOwnerPackage} from '../../scripts/genesis-owner-package.mjs';
const migration='supabase/migrations/20261114184238_ares_genesis_owner_approval_v11.sql';
test('source recovery exposes exact allocation without inventing external routes or authority',()=>{
 const p=buildOwnerPackage();assert.equal(p.status,'incomplete');assert.equal(p.externalAuthorityRequired,false);
 assert.equal(p.protected_routes_v5.length,1);assert.equal(p.protected_routes_v5[0].status,'pending');
 assert.deepEqual(p.campusRamp.worldEnd,[-516,-187]);assert.equal(p.geometry.knownFixedConflicts.length,0);
 assert.equal(p.allocation.xMin,-585.2);assert.equal(p.mapping.scale,4.5);
});
test('owner identity, immutable exact proposal, issuance and live RPC remain separate gates',async()=>{
 const db=new PGlite();
 try{
 await db.exec(readFileSync('tests/genesis-v11/fixture.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261114120000_ares_genesis_certification_v11.sql','utf8'));
 // Isolated compatibility fixture mirrors columns inspected in production. Never deploy.
 await db.exec(readFileSync('tests/genesis-v11/legacy-authority-fixture.sql','utf8'));
 await db.exec(readFileSync(migration,'utf8'));
 const id='00000000-0000-0000-0000-000000000010',owner='00000000-0000-0000-0000-000000000003';
 const world=(await db.query('select public.ares_genesis_world_snapshot_v11() as w')).rows[0].w;
 const site={ownerProposalId:id,placement:{x:-516,z:-213,rotationY:0},occupancyComplete:true,routesReserved:true,placementReserved:true,occupied:[],protectedRoutes:[{id:'fixture',kind:'box',x:100,z:100,halfWidth:1,halfDepth:1}],reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:54.7,halfDepth:67.7}]};
 const inventory={completeWorldCoverage:true,externalRoutesComplete:true,geometryValidated:true,landmarkExtentsVerified:true,mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},terrainDigest:'c'.repeat(64),sourceRevision:'synthetic-test',routes:[{route_key:'fixture',route_kind:'walking',xMin:99,xMax:101,zMin:99,zMax:101,source_digest:'d'.repeat(64)}]};
 const insert=inv=>db.query(`insert into genesis_v11.proposals(id,colony_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,valid_until) values($1,'00000000-0000-0000-0000-000000000001',$2,$3,'https://example.invalid/synthetic-evidence-fixture',$4,$5,$6,statement_timestamp()+interval '5 minutes')`,[id,'a'.repeat(64),'b'.repeat(64),JSON.stringify(world),JSON.stringify(site),JSON.stringify(inv)]);
 await assert.rejects(insert({}),/check constraint|Route registry\/site mismatch/);
 await assert.rejects(insert({...inventory,routes:[{...inventory.routes[0],xMin:-550,xMax:-510}]}),/mismatch/);
 await insert(inventory);
 await db.exec('set role service_role');
 await assert.rejects(db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[id]),/BOBU_OWNER_APPROVAL_REQUIRED/);
 await assert.rejects(db.exec(`insert into genesis_v11.owners values('${owner}')`),/permission denied/);
 await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`);
 await assert.rejects(db.query('select public.decide_ares_genesis_owner_proposal_v11($1,true)',[id]),/BOBU_OWNER_REQUIRED/);
 await db.exec(`reset role; insert into genesis_v11.owners values('${owner}'); set role authenticated`);
 const fetched=(await db.query('select public.get_ares_genesis_owner_proposal_v11($1) as p',[id])).rows[0].p;
 assert.deepEqual(fetched.site,site);
 await db.query('select public.decide_ares_genesis_owner_proposal_v11($1,true)',[id]);
 await assert.rejects(db.query('select public.decide_ares_genesis_owner_proposal_v11($1,false)',[id]),/unique constraint/);
 await assert.rejects(db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[id]),/permission denied/);
 await db.exec('reset role');
 await assert.rejects(db.exec("update genesis_v11.proposals set evidence_digest=repeat('f',64)"),/immutable/);
 await db.exec('set role service_role');
 await db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[id]);
 await assert.rejects(db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[id]),/already issued/);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int as n from genesis_v10.entitlement')).rows[0].n,1);
 await db.exec('set role authenticated');
 assert.equal((await db.query('select public.get_ares_genesis_placement_v10() as r')).rows[0].r.status,'approved');
 // A fresh owner decision can renew the identical allocation without losing history.
 const renewed='00000000-0000-0000-0000-000000000011';
 await db.exec('reset role');
 await db.query(`insert into genesis_v11.proposals(id,colony_id,release_digest,evidence_digest,evidence_uri,world_snapshot,site,inventory,valid_until) select $1::uuid,colony_id,release_digest,evidence_digest,evidence_uri,public.ares_genesis_world_snapshot_v11(),jsonb_set(site,'{ownerProposalId}',to_jsonb(($1::uuid)::text)),inventory,statement_timestamp()+interval '5 minutes' from genesis_v11.proposals where id=$2`,[renewed,id]);
 await db.exec('set role authenticated');
 await db.query('select public.decide_ares_genesis_owner_proposal_v11($1,true)',[renewed]);
 await db.exec('set role service_role');
 await db.query('select public.issue_ares_genesis_owner_certificate_v11($1)',[renewed]);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int as n from public.ares_genesis_certificates_v11')).rows[0].n,2);
 assert.equal((await db.query('select count(*)::int as n from genesis_v10.entitlement')).rows[0].n,1);
 await db.exec('set role authenticated');
 assert.equal((await db.query('select public.get_ares_genesis_placement_v10() as r')).rows[0].r.status,'approved');
 await db.query('select public.withdraw_ares_genesis_owner_certificate_v11($1)',[renewed]);
 assert.equal((await db.query('select public.get_ares_genesis_placement_v10() as r')).rows[0].r.status,'blocked');
 await db.exec('reset role; update public.mars_colony_buildings set grid_x=1; set role authenticated');
 assert.equal((await db.query('select public.get_ares_genesis_placement_v10() as r')).rows[0].r.status,'blocked');
 }finally{await db.close();}
});

test('offline verifier checks actual shipped geometry and rejects a route through the campus',async()=>{
 const {collectGenesisSourceEvidence}=await import('../../scripts/genesis-source-evidence.mjs');
 const {verifyOwnerProposal}=await import('../../scripts/genesis-verify-owner-proposal.mjs');
 const source=collectGenesisSourceEvidence({includeGeometry:true}),pkg=buildOwnerPackage();
 const r=pkg.protected_routes_v5[0],bounds=r.bounds;
 // Synthetic world scope, using genuine source geometry. No production authority.
 const p={id:'synthetic',colony_id:'fixture',release_digest:source.releaseDigest,world_snapshot:{colonies:[{id:'fixture'}],buildings:[],definitions:[],landmarks:[],mission_catalog:[]},inventory:{completeWorldCoverage:true,externalRoutesComplete:true,landmarkExtentsVerified:true,mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},terrainDigest:source.sourceDigests['public/mars/ares-genesis/ares-genesis-height-16.bin'],landmarkExtents:[],routes:[{...r,...bounds}]},site:{ownerProposalId:'synthetic',placement:pkg.placement,occupancyComplete:true,routesReserved:true,placementReserved:true,occupied:source.sourceGeometry.fixed,reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:54.7,halfDepth:67.7}],protectedRoutes:[{id:r.route_key,kind:'box',x:(bounds.xMin+bounds.xMax)/2,z:(bounds.zMin+bounds.zMax)/2,halfWidth:(bounds.xMax-bounds.xMin)/2,halfDepth:(bounds.zMax-bounds.zMin)/2}]}};
 assert.equal(verifyOwnerProposal(p).geometryValidated,true);
 // Mission interaction areas protect campus placement but remain accessible on foot.
 p.world_snapshot.mission_catalog=[{mission_key:'fixture-mission',enabled:true,target_x:-44,target_z:-57.2,target_radius:6}];
 p.site.occupied.push({id:'fixture-mission',kind:'circle',x:-44,z:-57.2,radius:6});
 assert.equal(verifyOwnerProposal(p).geometryValidated,true);
 p.inventory.routes[0].xMin=-550;p.inventory.routes[0].xMax=-510;
 p.site.protectedRoutes[0].x=-530;p.site.protectedRoutes[0].halfWidth=20;
 p.inventory.routes[0].zMin=-230;p.inventory.routes[0].zMax=-190;
 p.site.protectedRoutes[0].z=-210;p.site.protectedRoutes[0].halfDepth=20;
 assert.throws(()=>verifyOwnerProposal(p),/intersects campus/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingOccupancy,areasOverlap,overlappingReservations,blockedPlacementReview} from '../../src/core/mars/exploration/genesis-v5/colony-occupancy.mjs';
const hub={colony_id:'test-colony',building_id:'hub',building_key:'command_hub',building_status:'active',built:true,grid_x:0,grid_z:0,rotation_y:0,footprint_width:4,footprint_depth:4};
// Unit inputs exercise RPC contract geometry; never live safety evidence.
const convert=(x,z,w,d)=>({x:-50.75+(x+(w-1)/2)*4.5,z:-74.75+(z+(d-1)/2)*4.5});
test('RPC effective rotated dimensions are converted once, including unknown visual keys',()=>{
 const rows=[hub,{...hub,building_id:'other',building_key:'food',grid_x:8,rotation_y:90,footprint_width:2,footprint_depth:3}];
 const r=buildingOccupancy(rows,convert,4.5);assert.equal(r.boxes.length,2);assert.equal(r.boxes[0].x,-44);assert.equal(r.boxes[0].z,-68);assert.equal(r.boxes[1].halfWidth,5.1);assert.equal(r.boxes[1].halfDepth,7.35);assert.equal(r.boxes[1].x,-12.5);
 for(const rotation_y of [0,90,180,270])assert.equal(buildingOccupancy([hub,{...rows[1],rotation_y}],convert,4.5).boxes[1].halfWidth,5.1);
});
test('reject missing placements, mixed colonies, duplicates, invalid footprints and missing hub',()=>{
 for(const patch of [{grid_x:null},{rotation_y:45},{footprint_width:NaN},{footprint_depth:0},{building_id:null}])assert.throws(()=>buildingOccupancy([{...hub,...patch}],convert,4.5));
 for(const rows of [[],[hub,hub],[{...hub,building_key:'habitat'}],[hub,{...hub,colony_id:'other'}]])assert.throws(()=>buildingOccupancy(rows,convert,4.5));
 assert.equal(buildingOccupancy([hub,{...hub,built:false,building_id:null}],convert,4.5).boxes.length,1);
});
test('route boxes, touching reservations and circular rocks collide conservatively',()=>{
 const route={id:'route',kind:'box',x:0,z:0,halfWidth:2,halfDepth:20};
 assert(areasOverlap(route,{id:'campus',kind:'box',x:3,z:0,halfWidth:1,halfDepth:1}));
 assert(areasOverlap(route,{id:'rock',kind:'circle',x:3,z:0,radius:1}));
 assert(!areasOverlap(route,{id:'clear',kind:'circle',x:4,z:0,radius:1}));
 assert.deepEqual(overlappingReservations([route,{...route,id:'entrance'}]),[['route','entrance']]);
 assert.throws(()=>areasOverlap(route,{kind:'triangle',x:0,z:0}));
});
test('unavailable, stale, future, fresh and forged approval snapshots never return safe candidates',()=>{
 for(const s of [null,{status:'ready',complete:true},{status:'blocked',observedAt:0},{status:'blocked',observedAt:100000},{status:'blocked',observedAt:100}]){const r=blockedPlacementReview(s,100);assert.equal(r.status,'blocked');assert.deepEqual(r.safeCandidates,[]);assert(r.blockers.length>=5);}
});
test('occupancy diagnostics stay read-only; placement approval uses the existing server RPC',()=>{
 const s=readFileSync('src/core/mars/exploration/genesis-v5/AresColonyOccupancyAdapter.ts','utf8');
 const diagnostic=s.slice(s.indexOf('export async function readAresColonyOccupancy()'),s.indexOf('export async function reviewAresGenesisPlacement()'));
 assert(diagnostic.includes('await getMyMarsColonyBase()'));
 assert(!/supabase|moveMy|constructMy|upgradeMy|localStorage|location.search/.test(diagnostic));
 assert(!/moveMy|constructMy|upgradeMy|localStorage|location.search|supabase\.from/.test(s));
 assert.deepEqual([...s.matchAll(/supabase\.rpc\('([^']+)'/g)].map(match=>match[1]),['get_ares_genesis_placement_v10']);
 assert(s.includes("result.status !== 'approved'"));
 assert(s.includes("status:'blocked'") && s.includes('blockedPlacementReview(occupancy)'));
 for(const field of ['protectedRoutes:null','legalRegions:null','authoritativeRevision:null','reservation:null'])assert(s.includes(field));
});

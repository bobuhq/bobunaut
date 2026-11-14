import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {collectGenesisSourceEvidence} from './genesis-source-evidence.mjs';
import {prepareIntegratedCampus} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
export function verifyOwnerProposal(p){
 const source=collectGenesisSourceEvidence({includeGeometry:true}),i=p.inventory,w=p.world_snapshot;
 assert.equal(p.release_digest,source.releaseDigest);assert.equal(i.terrainDigest,source.sourceDigests['public/mars/ares-genesis/ares-genesis-height-16.bin']);
 for(const k of ['completeWorldCoverage','externalRoutesComplete','landmarkExtentsVerified'])assert.equal(i[k],true);
 assert.deepEqual(i.mapping,{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0});
 for(const k of ['colonies','buildings','definitions','landmarks','mission_catalog'])assert(Array.isArray(w[k]));
 const buildings=w.buildings.filter(b=>b.status!=='archived').map(b=>{const d=w.definitions.find(d=>d.building_key===b.building_key);assert(d);assert([0,90,180,270].includes(b.rotation_y));let width=d.footprint_width,depth=d.footprint_depth;if([90,270].includes(b.rotation_y))[width,depth]=[depth,width];assert([width,depth].every(v=>Number.isInteger(v)&&v>0&&v<=8));return {id:b.id,kind:'box',x:-50.75+(b.grid_x+(width-1)/2)*4.5,z:-74.75+(b.grid_z+(depth-1)/2)*4.5,halfWidth:width*2.25+.6,halfDepth:depth*2.25+.6};});
 assert(Array.isArray(i.landmarkExtents));for(const l of w.landmarks.filter(l=>l.is_active!==false))assert(i.landmarkExtents.some(e=>e.id===l.landmark_key));
 const missions=w.mission_catalog.filter(m=>m.enabled!==false).map(m=>({id:m.mission_key,kind:'circle',x:m.target_x,z:m.target_z,radius:m.target_radius}));
 assert.deepEqual(p.site.occupied,[...source.sourceGeometry.fixed,...buildings,...i.landmarkExtents,...missions]);
 assert.equal(p.site.ownerProposalId,p.id);
 const campus=prepareIntegratedCampus({...p.site,sample:source.sourceGeometry.sample});
 return {geometryValidated:true,scope:'integrated geometry only; no authorization',releaseDigest:source.releaseDigest,placement:campus.placement,reservations:campus.reservations.length};
}
if(process.argv[1]?.endsWith('/genesis-verify-owner-proposal.mjs')){assert(process.argv[2],'Provide a genuine complete proposal JSON');console.log(JSON.stringify(verifyOwnerProposal(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));}

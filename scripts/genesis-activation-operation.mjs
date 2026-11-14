import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyOwnerProposal} from './genesis-verify-owner-proposal.mjs';

const base='https://pvemtnmeewyaqgindocs.supabase.co';
const digest=/^[a-f0-9]{64}$/;
// Supplement the shipped geometry verifier without changing its release manifest.
export function verifyActivationInventory(p){
 const i=p.inventory;
 assert(i && i.geometryValidated===true,'Verified geometry inventory required');
 assert(Array.isArray(i.routes)&&i.routes.length>0,'Complete external route evidence required');
 assert(typeof i.sourceRevision==='string'&&i.sourceRevision.length>=7,'Source revision required');
 const keys=new Set();
 const routes=i.routes.map(r=>{
  assert(typeof r.route_key==='string'&&r.route_key.length>0&&!keys.has(r.route_key),'Unique route keys required');keys.add(r.route_key);
  assert(['entrance','walking','landing_access','service','emergency'].includes(r.route_kind),'Invalid route kind');
  assert(digest.test(r.source_digest),'Route source digest required');
  assert(['xMin','xMax','zMin','zMax'].every(k=>Number.isFinite(r[k])&&Math.abs(r[k])<=6350),'Finite route bounds required');
  assert(r.xMin<r.xMax&&r.zMin<r.zMax,'Positive route bounds required');
  return {id:r.route_key,kind:'box',x:(r.xMin+r.xMax)/2,z:(r.zMin+r.zMax)/2,halfWidth:(r.xMax-r.xMin)/2,halfDepth:(r.zMax-r.zMin)/2};
 });
 assert.deepEqual(p.site.protectedRoutes,routes,'Route registry/site mismatch');
 assert(Array.isArray(i.landmarkExtents),'Landmark extent inventory required');
 const active=p.world_snapshot.landmarks.filter(l=>l.is_active!==false);
 assert.equal(i.landmarkExtents.length,active.length,'Exact active landmark inventory required');
 const ids=new Set();
 for(const e of i.landmarkExtents){
  assert(active.some(l=>l.landmark_key===e.id)&&!ids.has(e.id),'Unknown or duplicate landmark');ids.add(e.id);
  assert([e.x,e.z].every(Number.isFinite),'Finite landmark position required');
  assert(e.kind==='box'?[e.halfWidth,e.halfDepth].every(v=>Number.isFinite(v)&&v>0):e.kind==='circle'&&Number.isFinite(e.radius)&&e.radius>0,'Positive landmark extent required');
 }
 assert(digest.test(p.release_digest)&&digest.test(p.evidence_digest),'Release/evidence digests required');
 assert(/^https:\/\/[^\s]+$/.test(p.evidence_uri),'Evidence archive HTTPS URI required');
 return true;
}

export async function approveOwnerProposal(p,{key,token,evidenceBytes,fetchImpl=fetch,verify=verifyOwnerProposal,now=Date.now()}={}){
 assert(key&&token,'GENESIS_PUBLISHABLE_KEY and genuine GENESIS_PLAYER_ACCESS_TOKEN required');
 assert(evidenceBytes,'Exact reviewed evidence archive bytes required');
 assert.equal(createHash('sha256').update(evidenceBytes).digest('hex'),p.evidence_digest,'Evidence archive digest mismatch');
 verifyActivationInventory(p);verify(p);
 assert(Date.parse(p.valid_until)>now+60000,'Proposal must remain valid for more than one minute');
 const headers={apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 async function request(path,body){
  const response=await fetchImpl(base+path,{headers,...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)}),redirect:'error'});
  // Never include server response bodies or credentials in error output.
  assert(response.ok,`Owner operation failed: HTTP ${response.status}`);
  const text=await response.text();return text?JSON.parse(text):null;
 }
 const user=await request('/auth/v1/user');
 assert(user.id&&user.email?.toLowerCase()==='bobuuniverse@gmail.com','Authenticated BOBU owner email required');
 const stored=await request('/rest/v1/rpc/get_ares_genesis_owner_proposal_v11',{proposal:p.id});
 assert(stored,'Proposal is not registered in production');
 // JSON key order from Postgres is immaterial; all values must match reviewed bytes.
 assert.deepEqual(stored,p,'Stored proposal differs from the reviewed proposal');
 await request('/rest/v1/rpc/decide_ares_genesis_owner_proposal_v11',{proposal:p.id,approve:true});
 return {proposal:p.id,ownerDecisionRecorded:true,certificateIssued:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.equal(process.argv[2],'approve','Usage: node scripts/genesis-activation-operation.mjs approve REVIEWED_PROPOSAL.json EVIDENCE_ARCHIVE');
 assert(process.argv[3]&&process.argv[4],'Exact production proposal JSON and evidence archive required');
 const proposal=JSON.parse(readFileSync(process.argv[3],'utf8'));
 console.log(JSON.stringify(await approveOwnerProposal(proposal,{key:process.env.GENESIS_PUBLISHABLE_KEY,token:process.env.GENESIS_PLAYER_ACCESS_TOKEN,evidenceBytes:readFileSync(process.argv[4])}),null,2));
}

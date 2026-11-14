import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateGenesisCertificate} from '../src/core/mars/exploration/genesis-v5/certification.mjs';
// Read-only. Supply a genuine player access token via environment; never log it.
const base='https://pvemtnmeewyaqgindocs.supabase.co';
const key=process.env.GENESIS_PUBLISHABLE_KEY,token=process.env.GENESIS_PLAYER_ACCESS_TOKEN;
assert(key&&token,'GENESIS_PUBLISHABLE_KEY and a genuine GENESIS_PLAYER_ACCESS_TOKEN are required');
const headers={apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
async function request(path,body){
 const r=await fetch(base+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});
 assert(r.ok,`Authenticated read failed: HTTP ${r.status}`);return r.json();
}
const user=await request('/auth/v1/user');assert(user.id,'Server could not verify player identity');
const rows=await request('/rest/v1/rpc/get_my_mars_colony_base',{});
assert(Array.isArray(rows)&&rows.length,'No colony');
const colonies=new Set(rows.map(b=>b.colony_id));assert.equal(colonies.size,1,'Ambiguous colony');
const result=await request('/rest/v1/rpc/get_ares_genesis_placement_v10',{});
const releaseDigest=JSON.parse(readFileSync('src/core/mars/genesis-release.json','utf8')).sha256;
validateGenesisCertificate(result,{colonyId:[...colonies][0],releaseDigest});
console.log(JSON.stringify({status:'approved',revision:result.revision,releaseDigest,evidenceDigest:result.evidence_digest,expiresAt:result.expires_at,authenticatedPlayerVerified:true}));

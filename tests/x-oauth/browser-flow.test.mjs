import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
let serial = 0;
async function load(providers = ['x','google']) {
 const values = new Map();
 globalThis.localStorage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let userId='builder', status='pending', offline=false, claims=0;
 let identities=providers.map(provider=>({provider,user_id:'builder',id:provider+'-provider',identity_id:provider+'-old',created_at:'2026-01-01T00:00:00Z'}));
 const unlinked=[];
 const auth={getUser:async()=>({data:{user:{id:userId,identities}},error:null}),getSession:async()=>({data:{session:{user:{id:userId},access_token:'token'}},error:null}),unlinkIdentity:async x=>{unlinked.push(x.provider);identities=identities.filter(i=>i!==x);return {error:null};}};
 const functions={invoke:async(name,options)=>{
  assert.equal(options.headers.Authorization,'Bearer token');
  if(offline) throw new Error('offline');
  if(name==='x-verification-status') return {data:{builder_id:userId,status,verified:status==='rewarded'},error:null};
  claims++; return status==='pending'?{error:{context:new Response(JSON.stringify({status:'fresh_x_oauth_required'}),{status:409})}}:{data:{verified:true,rewarded:claims===1,already_rewarded:claims>1,total_gp:100},error:null};
 }};
 globalThis.__xPort={auth,functions};
 const bundle=await build({stdin:{contents:`export * from './src/features/identity/services/xOAuthCallback'; export * from './src/features/identity/services/xVerificationStatus'; export * from './src/core/gp/services/GPRewardService'; // ${serial++}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'port',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'port',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const supabase=globalThis.__xPort;'}));}}]});
 const module=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}#${serial++}`);
 return {module,unlinked,values,get claims(){return claims},get identities(){return identities},switchAccount:()=>userId='other',status:s=>status=s,offline:()=>offline=true,link:(id='x-provider')=>identities.push({provider:'x',user_id:'builder',id,identity_id:'x-new',created_at:'2026-11-04T00:00:00Z'})};
}
test('fresh connection survives browser redirect and callback',async()=>{const x=await load(['google']);await x.module.beginXLink();x.link();await x.module.completeXOAuthCallback();assert.equal(await x.module.requireXIdentity('builder'),true);});
test('pending and relinked status never verify; rewarded status verifies',async()=>{const x=await load();for(const s of ['pending','relinked','rewarded']){x.status(s);const r=await x.module.readXVerification('builder');assert.equal(r.verified,s==='rewarded');assert.equal(r.pending,s!=='rewarded');}});
test('explicit confirmation required; Google preserved',async()=>{const x=await load();await assert.rejects(x.module.prepareXReconnect('builder',false));assert.deepEqual(x.unlinked,[]);await x.module.prepareXReconnect('builder',true);assert.deepEqual(x.unlinked,['x']);assert.deepEqual(x.identities.map(i=>i.provider),['google']);});
test('sole X login cannot unlink',async()=>{const x=await load(['x']);await assert.rejects(x.module.prepareXReconnect('builder',true));assert.deepEqual(x.unlinked,[]);});
test('wrong X account refused before reward',async()=>{const x=await load();await x.module.prepareXReconnect('builder',true);x.link('wrong');await assert.rejects(x.module.validateXRecovery('builder'),/original X/);assert.equal(x.claims,0);});
test('cancellation and retry retain original account across reload',async()=>{const x=await load();await x.module.prepareXReconnect('builder',true);const saved=[...x.values.entries()];await x.module.beginXLink();await x.module.clearXLink();assert.equal(await x.module.hasXRecovery('builder'),true);assert(saved.some(([k])=>k.includes('recovery')));await x.module.prepareXReconnect('builder',true);await x.module.beginXLink();x.link();await Promise.all([x.module.completeXOAuthCallback(),x.module.completeXOAuthCallback()]);await x.module.validateXRecovery('builder');});
test('old identity requires fresh OAuth and 409 is recognized',async()=>{const x=await load();await assert.rejects(x.module.gpRewardService.claimGenesisReward('x','builder'),/fresh_x_oauth_required/);});
test('duplicate concurrent claims share one server request',async()=>{const x=await load();x.status('rewarded');await Promise.all([x.module.gpRewardService.claimGenesisReward('x','builder'),x.module.gpRewardService.claimGenesisReward('x','builder')]);assert.equal(x.claims,1);});
test('switched Builder blocked before unlink, callback and claim',async()=>{const x=await load();await x.module.beginXLink();x.switchAccount();await assert.rejects(x.module.prepareXReconnect('builder',true));await assert.rejects(x.module.completeXOAuthCallback());await assert.rejects(x.module.gpRewardService.claimGenesisReward('x','builder'));assert.deepEqual(x.unlinked,[]);assert.equal(x.claims,0);});
test('server unavailable fails closed',async()=>{const x=await load();x.offline();const r=await x.module.readXVerification('builder');assert.equal(r.verified,false);assert.equal(r.status,'unavailable');await assert.rejects(x.module.gpRewardService.claimGenesisReward('x','builder'));});

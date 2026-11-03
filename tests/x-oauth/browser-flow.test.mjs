import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
let serial=0;
async function load(identities=['x','google','apple','email'], {user='builder',remove=true}={}) {
 const values=new Map();
 globalThis.sessionStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const calls={unlinked:[],session:0,reads:0};
 let current=identities.map(provider=>({id:`${provider}-id`,provider}));
 const auth={
  getUser:async()=>({data:{user:user?{id:user}:null},error:null}),
  getSession:async()=>{calls.session++;return {data:{session:{user:{id:user}}},error:null};},
  getUserIdentities:async()=>{calls.reads++;return {data:{identities:current},error:null};},
  unlinkIdentity:async identity=>{calls.unlinked.push(identity.provider);if(remove) current=current.filter(item=>item.id!==identity.id);return {error:null};},
 };
 globalThis.__xOAuthAuthTestPort=auth;
 const bundle=await build({stdin:{contents:`export * from './src/features/identity/services/xOAuthRelink';\nexport * from './src/features/identity/services/xOAuthCallback';\nexport * from './src/features/identity/services/xReauthGuard';\n// ${serial++}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',plugins:[{
  name:'local-auth-port',setup(build){build.onResolve({filter:/lib\/supabase$/},()=>({path:'auth-port',namespace:'auth-test'}));
  build.onLoad({filter:/.*/,namespace:'auth-test'},()=>({contents:'export const supabase={auth:globalThis.__xOAuthAuthTestPort};',loader:'js'}));}
 }]});
 const module=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}#case-${serial++}`);
 return {module,calls,auth,get providers(){return current.map(item=>item.provider);}};
}
test('unlink requires explicit confirmation before any Auth request',async()=>{
 const x=await load();await assert.rejects(x.module.unlinkXForReverification(false));
 assert.equal(x.calls.reads,0);assert.deepEqual(x.calls.unlinked,[]);
});
test('sole X sign-in cannot be unlinked',async()=>{
 const x=await load(['x']);await assert.rejects(x.module.unlinkXForReverification(true));assert.deepEqual(x.calls.unlinked,[]);
});
test('only X is unlinked and Google, Apple, email identities survive',async()=>{
 const x=await load();await x.module.unlinkXForReverification(true);
 assert.deepEqual(x.calls.unlinked,['x']);assert.deepEqual(x.providers,['google','apple','email']);assert.equal(x.calls.reads,2);
});
test('failed unlink confirmation blocks relinking',async()=>{
 const x=await load(undefined,{remove:false});await assert.rejects(x.module.unlinkXForReverification(true),/still linked/);
});
test('expired authentication blocks unlink',async()=>{
 const x=await load(undefined,{user:null});await assert.rejects(x.module.unlinkXForReverification(true));assert.deepEqual(x.calls.unlinked,[]);
});
test('callback refuses a different BOBU account',async()=>{
 const x=await load();await x.module.beginXReauthentication();
 x.auth.getUser=async()=>({data:{user:{id:'other-builder'}},error:null});
 await assert.rejects(x.module.completeXOAuthCallback(),/account changed/);
});
test('callback refuses missing account binding',async()=>{
 const x=await load();await assert.rejects(x.module.completeXOAuthCallback(),/account changed/);
});
test('StrictMode callbacks share session initialization',async()=>{
 const x=await load();await x.module.beginXReauthentication();
 await Promise.all([x.module.completeXOAuthCallback(),x.module.completeXOAuthCallback()]);assert.equal(x.calls.session,1);
});
test('callback initialization failure permits a safe retry',async()=>{
 const x=await load();await x.module.beginXReauthentication();
 x.auth.getSession=async()=>({data:{session:null},error:{message:'expired'}});
 await assert.rejects(x.module.completeXOAuthCallback(),/session unavailable/);
 x.auth.getSession=async()=>({data:{session:{}},error:null});await x.module.completeXOAuthCallback();
});

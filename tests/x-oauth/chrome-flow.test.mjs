import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const chrome=process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test('Chrome: X redirect/reload, recovery, account safety and server claims', {skip:!existsSync(chrome),timeout:60000},async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'bobu-x-browser-'));
 try {
 const bundle=await build({stdin:{contents:`
 import * as flow from './src/features/identity/services/xOAuthCallback';
 import {readXVerification} from './src/features/identity/services/xVerificationStatus';
 import {gpRewardService} from './src/core/gp/services/GPRewardService';
 window.run = async () => {
 const check=(v,m)=>{if(!v)throw new Error(m)};
 const rejects=async(fn)=>{let failed=false;try{await fn()}catch{failed=true}check(failed,'expected rejection')};
 const saved=JSON.parse(localStorage.getItem('test-port')||'null');
 let userId='builder', status='pending', offline=false, claims=0;
 let identities=saved || [{provider:'google',user_id:'builder',id:'google-provider',identity_id:'google-old'}];
 window.port.auth={getUser:async()=>({data:{user:{id:userId,identities}},error:null}),getSession:async()=>({data:{session:{user:{id:userId},access_token:'token'}},error:null}),unlinkIdentity:async x=>{check(x.provider==='x','only X unlink');identities=identities.filter(i=>i!==x);return {error:null}}};
 window.port.functions={invoke:async(name,options)=>{
 check(options.headers.Authorization==='Bearer token','bearer token');if(offline)throw Error('offline');
 if(name==='x-verification-status')return {data:{builder_id:userId,status,verified:status==='rewarded'},error:null};
 claims++;if(status==='pending')return {error:{context:new Response(JSON.stringify({status:'fresh_x_oauth_required'}),{status:409})}};
 return {data:{verified:true,total_gp:100,already_rewarded:claims>1},error:null};
 }};
 const link=(id='original')=>identities.push({provider:'x',user_id:'builder',id,identity_id:'x-'+Math.random(),created_at:'2026-11-04T00:00:00Z'});
 const stage=localStorage.getItem('stage');
 if(!stage){
  await flow.beginXLink();link();localStorage.setItem('test-port',JSON.stringify(identities));localStorage.setItem('stage','fresh');location.reload();return;
 }
 if(stage==='fresh'){
  await flow.completeXOAuthCallback();check(await flow.requireXIdentity('builder'),'fresh link');await flow.clearXLink();
  check(!(await readXVerification('builder')).verified,'pending cannot verify');
  await rejects(()=>flow.prepareXReconnect('builder',false));
  await flow.prepareXReconnect('builder',true);check(identities.length===1&&identities[0].provider==='google','Google survives');
  await flow.beginXLink();await flow.clearXLink();check(await flow.hasXRecovery('builder'),'cancel retains recovery');
  localStorage.setItem('test-port',JSON.stringify(identities));localStorage.setItem('stage','retry');location.reload();return;
 }
 check(await flow.hasXRecovery('builder'),'reload preserves recovery');
 await flow.prepareXReconnect('builder',true);await flow.beginXLink();link('wrong');await rejects(()=>flow.completeXOAuthCallback());check(claims===0,'wrong account cannot claim');
 await flow.prepareXReconnect('builder',true);link();await flow.completeXOAuthCallback();
 await rejects(()=>gpRewardService.claimGenesisReward('x','builder'));check((await readXVerification('builder')).pending,'409 remains pending');
 status='relinked';check(!(await readXVerification('builder')).verified,'relinked cannot verify');
 status='rewarded';const before=claims;await Promise.all([gpRewardService.claimGenesisReward('x','builder'),gpRewardService.claimGenesisReward('x','builder')]);check(claims===before+1,'deduplicated claim');
 await flow.finishXRecovery('builder');check((await readXVerification('builder')).verified,'authoritative rewarded');
 userId='other';await rejects(()=>flow.prepareXReconnect('builder',true));await rejects(()=>gpRewardService.claimGenesisReward('x','builder'));check(!(await readXVerification('builder')).verified,'switch fails closed');
 userId='builder';offline=true;check((await readXVerification('builder')).status==='unavailable','network fails closed');
 localStorage.clear();document.body.textContent='BOBU_BROWSER_PASS';
 };
 `,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',plugins:[{name:'port',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'port',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'window.port={};export const supabase=window.port;'}));}}]});
 await writeFile(join(dir,'test.html'),`<body>RUNNING<script>${bundle.outputFiles[0].text}</script><script>run().catch(e=>document.body.textContent='FAIL: '+e.message)</script>`);
 let output;
 try { output=await promisify(execFile)(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run',`--user-data-dir=${join(dir,'profile')}`,'--virtual-time-budget=15000','--dump-dom',`file://${join(dir,'test.html')}`],{timeout:45000,maxBuffer:2e6}); } catch(error) {
 if(error.signal==='SIGABRT' && !error.stdout && !error.stderr) {t.skip('Chrome aborts before startup in this managed environment');return;}
 throw error;
 }
 assert.match(output.stdout,/<body>BOBU_BROWSER_PASS<\/body>/);
 } finally {await rm(dir,{recursive:true,force:true});}
});

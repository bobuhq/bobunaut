import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {buildSync} from 'esbuild';
import ts from 'typescript';
import * as sdk from '@solana/web3.js';
const require=createRequire(import.meta.url);
const buyer=sdk.Keypair.fromSeed(new Uint8Array(32).fill(1));
const treasury=sdk.Keypair.fromSeed(new Uint8Array(32).fill(2));
const blockhash=sdk.Keypair.fromSeed(new Uint8Array(32).fill(3)).publicKey.toBase58();
function rpcFixture(){
 const requests=[];
 const fetch=async(_url,options)=>{
  const request=JSON.parse(options.body);requests.push(request);
  let result;
  switch(request.method){
   case 'getLatestBlockhash':result={context:{slot:1},value:{blockhash,lastValidBlockHeight:123}};break;
   case 'getBalance':result={context:{slot:1},value:42};break;
   case 'sendTransaction':result='fixture-signature';break;
   default:throw Error('Unexpected network operation: '+request.method);
  }
  return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 return {requests,fetch};
}
test('patched JSON-RPC dependency works in the real Node SDK and browser bundle',async()=>{
 const bundle=buildSync({stdin:{contents:"import {Connection,PublicKey} from '@solana/web3.js';globalThis.sdk={Connection,PublicKey};",resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text;
 const browser={crypto:webcrypto,console,TextEncoder,TextDecoder,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Buffer};
 vm.runInNewContext(bundle,browser);
 for(const api of [sdk,browser.sdk]){
  const fixture=rpcFixture();
  const connection=new api.Connection('https://example.invalid',{fetch:fixture.fetch,commitment:'confirmed'});
  assert.equal(await connection.getBalance(new api.PublicKey(buyer.publicKey.toBase58())),42);
  assert.equal((await connection.getLatestBlockhash()).blockhash,blockhash);
  assert.equal(new Set(fixture.requests.map(r=>r.id)).size,2);
  for(const request of fixture.requests)assert.match(request.id,/^[a-f0-9-]{36}$/);
 }
});
test('existing payment flow preserves transfer, memo, wallet signing and preflight',async()=>{
 const fixture=rpcFixture(),cache=new Map();
 class Connection extends sdk.Connection {
  constructor(url,commitment){super(url,{commitment,fetch:fixture.fetch});assert.equal(url,'https://api.devnet.solana.com');}
  sendRawTransaction(bytes,options){assert.equal(options.skipPreflight,false);return super.sendRawTransaction(bytes,options);}
 }
 const window={solana:{publicKey:buyer.publicKey,isConnected:true,signTransaction:async tx=>{tx.partialSign(buyer);return tx;}}};
 function load(name){
  if(cache.has(name))return cache.get(name);
  const exports={};cache.set(name,exports);
  const code=ts.transpileModule(readFileSync('src/core/mars/solana/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,window,console,require:id=>id==='@solana/web3.js'?{...sdk,Connection}:id.startsWith('./')?load(id.slice(2)):require(id)});
  return exports;
 }
 const payment=load('MarsSolanaPaymentTransaction');
 const checkout={network:'devnet',amountLamports:1000,paymentReference:'fixture-reference-with-at-least-30-characters',buyerWallet:buyer.publicKey.toBase58(),treasuryAddress:treasury.publicKey.toBase58()};
 for(const patch of [{network:'mainnet'},{amountLamports:0},{amountLamports:Number.MAX_SAFE_INTEGER+1},{paymentReference:''}])await assert.rejects(payment.prepareMarsPixelSolanaPaymentTransaction({...checkout,...patch}));
 const prepared=await payment.prepareMarsPixelSolanaPaymentTransaction(checkout);
 assert.equal(prepared.lastValidBlockHeight,123);
 const transfer=sdk.SystemInstruction.decodeTransfer(prepared.transaction.instructions[0]);
 assert.equal(transfer.fromPubkey.toBase58(),checkout.buyerWallet);
 assert.equal(transfer.toPubkey.toBase58(),checkout.treasuryAddress);
 assert.equal(transfer.lamports,1000n);
 assert.equal(prepared.transaction.instructions[1].data.toString(),checkout.paymentReference);
 const result=await load('MarsSolanaPaymentSender').signAndBroadcastMarsSolanaPayment(prepared.transaction);
 assert.equal(result.transactionSignature,'fixture-signature');
 const sent=fixture.requests.find(r=>r.method==='sendTransaction');
 assert.notEqual(sent.params[1].skipPreflight,true);
 assert.equal(sent.params[1].preflightCommitment,'confirmed');
 assert.equal(sent.params[1].maxRetries,3);
 assert(sdk.Transaction.from(Buffer.from(sent.params[0],'base64')).verifySignatures());
});

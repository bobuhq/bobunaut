import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGenesisCertificate} from '../../src/core/mars/exploration/genesis-v5/certification.mjs';
const now=1800000000000,iso=t=>new Date(t).toISOString();
// Synthetic contract fixtures only; these are never production certificates.
const context={colonyId:'fixture',releaseDigest:'a'.repeat(64),now};
const certificate=()=>({status:'approved',colony_id:'fixture',release_digest:context.releaseDigest,evidence_digest:'b'.repeat(64),revision:'fixture-revision',issued_at:iso(now-1000),expires_at:iso(now+60000),server_time:iso(now),site:{placement:{x:-516,z:-213,rotationY:0},occupancyComplete:true,routesReserved:true,placementReserved:true,occupied:[],protectedRoutes:[],reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:100,halfDepth:100}]}});
test('current matching synthetic server contract passes geometry validation',()=>assert.equal(validateGenesisCertificate(certificate(),context).expiresAt,now+60000));
test('identity, release, evidence, missing approval and invalid leases fail closed',()=>{
 for(const patch of [{status:'blocked'},{colony_id:'other'},{release_digest:'c'.repeat(64)},{evidence_digest:''},{revision:''},{issued_at:iso(now+1)},{expires_at:iso(now+30000)},{expires_at:iso(now+61000)},{expires_at:iso(now+86400000)},{server_time:iso(now-31000)},{expires_at:'invalid'}])assert.throws(()=>validateGenesisCertificate({...certificate(),...patch},context));
 for(const value of [null,{},[]])assert.throws(()=>validateGenesisCertificate(value,context));
});
test('missing inventories, changed footprint, absent entitlement and conflicts block',()=>{
 for(const patch of [{occupied:null},{protectedRoutes:null},{reservedCells:null},{legalRegions:[]},{routesReserved:false},{placement:{x:0,z:0,rotationY:0}},{occupied:[{kind:'circle',x:-530,z:-210,radius:1}]},{protectedRoutes:[{kind:'box',x:-530,z:-210,halfWidth:1,halfDepth:1}]},{reservedCells:[{kind:'circle',x:NaN,z:0,radius:1}]}]){
  const c=certificate();Object.assign(c.site,patch);assert.throws(()=>validateGenesisCertificate(c,context));
 }
});
test('exact surveyed allocation passes but a micrometre of missing entitlement fails',()=>{
 const c=certificate();c.site.legalRegions=[{kind:'box',x:-530.5,z:-210.5,halfWidth:54.7,halfDepth:67.7}];
 assert.doesNotThrow(()=>validateGenesisCertificate(c,context));
 c.site.legalRegions[0].halfWidth-=.000001;
 assert.throws(()=>validateGenesisCertificate(c,context),/footprint blocked/);
});

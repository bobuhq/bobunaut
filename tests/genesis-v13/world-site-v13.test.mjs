import assert from 'node:assert/strict';
import test from 'node:test';
import {validateGenesisWorldSiteV13} from '../../src/core/mars/exploration/genesis-v5/world-site-v13.mjs';
import {integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT} from '../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
const colonyId='00000000-0000-0000-0000-000000000001';
const releaseDigest='677f59d58845f99a7e9df237b26500f08eb1ab270e98a9b2b24163d861e8a4f7';
const site={layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[{kind:'box',x:-44,z:-68,halfWidth:9.6,halfDepth:9.6}],protectedRoutes:[{kind:'box',id:'test-route',x:1000,z:1000,halfWidth:1,halfDepth:1}],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true};
const response={status:'registered',site_id:'00000000-0000-0000-0000-000000000010',colony_id:colonyId,release_digest:releaseDigest,authority_epoch:4,registered_at:'2026-11-17T00:00:00Z',site};
const validate=(r)=>validateGenesisWorldSiteV13(r,{colonyId,releaseDigest});
test('verified V13 world record contains no expiring browser lease',()=>{
 const result=validate(response);
 assert.equal(result.siteId,response.site_id);
 assert.equal(result.site,site);
 assert.equal('expiresAt' in result,false);
});
test('blocked/unauthorized response cannot authorize campus',()=>{
 assert.throws(()=>validate({...response,status:'blocked'}));
 assert.throws(()=>validate({...response,colony_id:'00000000-0000-0000-0000-000000000009'}));
 assert.throws(()=>validate({...response,release_digest:'a'.repeat(64)}));
 assert.throws(()=>validate({...response,authority_epoch:-1}));
 assert.throws(()=>validate({...response,site_id:'spoof'}));
});
test('invalid layout, occupied structure or missing routes rejected',()=>{
 assert.throws(()=>validate({...response,site:{...site,placement:{x:-516,z:-213,rotationY:0}}}));
 assert.throws(()=>validate({...response,site:{...site,occupied:[{kind:'box',x:-78,z:-72,halfWidth:1,halfDepth:1}]}}));
 assert.throws(()=>validate({...response,site:{...site,protectedRoutes:null}}));
});

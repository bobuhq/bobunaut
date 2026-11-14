import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareProductionCampus} from '../../src/core/mars/exploration/genesis-v5/production-site.mjs';
test('shipped terrain supports the full V11 foundation; geometry alone grants no authority',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bobu-v11-terrain-'));
 try {
  const out=join(dir,'terrain.cjs');
  buildSync({entryPoints:['src/core/mars/exploration/engine/AresGenesisTerrainData.ts'],outfile:out,bundle:true,platform:'node',format:'cjs'});
  const {sampleAresGenesisRenderedSurfaceMeters}=createRequire(import.meta.url)(out);
  const bytes=readFileSync('public/mars/ares-genesis/ares-genesis-height-16.bin');
  const terrain={width:256,height:256,elevations:Float32Array.from({length:65536},(_,i)=>-3836+bytes.readUInt16LE(i*2)/65535*381)};
  // Synthetic legal region and reservation flags exercise geometry, not live entitlement.
  const input={placement:{x:-516,z:-213,rotationY:0},sample:(x,z)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z),occupied:[],occupancyComplete:true,routesReserved:true,placementReserved:true,protectedRoutes:[],reservedCells:[],legalRegions:[{kind:'box',x:-530.5,z:-210.5,halfWidth:100,halfDepth:100}]};
  const site=prepareProductionCampus(input);
  assert(Number.isFinite(site.rootY));
  assert(site.floorWorldY>site.rootY);
  assert.throws(()=>prepareProductionCampus({...input,placementReserved:false}),/reservation unavailable/);
  assert.throws(()=>prepareProductionCampus({...input,sample:()=>NaN}),/Missing production terrain/);
 }finally {rmSync(dir,{recursive:true,force:true});}
});

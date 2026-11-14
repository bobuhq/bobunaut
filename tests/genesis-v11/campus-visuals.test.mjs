import test from 'node:test';
import assert from 'node:assert/strict';
import {campusArchitecture} from '../../src/core/mars/exploration/genesis-v5/campus-architecture.mjs';
import {INTEGRATED_ASSETS,integratedReservations} from '../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
test('every architectural detail stays inside unchanged physical collider and height',()=>{
 assert.equal(integratedReservations().length,24);
 for(const s of INTEGRATED_ASSETS){
  const parts=campusArchitecture(s.id);assert(parts.length>80);
  for(const p of parts){
   assert(p.position.every(Number.isFinite)&&p.size.every(v=>v>0));
   for(const [axis,limit] of [[0,s.width/2],[2,s.depth/2]])assert(Math.abs(p.position[axis])+p.size[axis]/2<=limit,`${s.id}/${p.name}: footprint`);
   assert(p.position[1]-p.size[1]/2>=0,`${s.id}/${p.name}: below deck`);
   assert(p.position[1]+p.size[1]/2<=s.height,`${s.id}/${p.name}: above camera/flight collider`);
  }
 }
});

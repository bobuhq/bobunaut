import test from 'node:test';
import assert from 'node:assert/strict';
import {disembarkPhase,disembarkActorLocal,EXIT_DURATION} from '../../src/core/mars/exploration/flight/disembark-v1.mjs';
test('landing sequence is ordered, single transition to ground',()=>{
 assert.equal(disembarkPhase(-1),'FLIGHT');
 assert.equal(disembarkPhase(0),'COCKPIT');
 assert.equal(disembarkPhase(3),'HATCH');
 assert.equal(disembarkPhase(6),'STAIRS');
 assert.equal(disembarkPhase(EXIT_DURATION),'GROUND');
});
test('BOBU goes outward and down stairs, not through hatch wall',()=>{
 const a=disembarkActorLocal(5.2),b=disembarkActorLocal(EXIT_DURATION);
 assert.equal(a.x,3.25);assert.equal(a.y,-1.05);
 assert(b.x>a.x&&b.y<a.y);assert.equal(b.y,-5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {validHandoff} from '../../src/core/mars/exploration/flight/handoff.mjs';
const landing={spawn:[117.4,0,-70],ship:[110,5.15,-70],yaw:0};
test('handoff rejects nonfinite, distant, airborne, obstructed and closed-door spawns',()=>{
 assert(validHandoff(landing,[],()=>0));
 for(const spawn of [[NaN,0,0],[Infinity,0,0],[7000,0,0],[200,0,-70],[117.4,5,-70]]) assert(!validHandoff({...landing,spawn},[],()=>0));
 assert(!validHandoff({...landing,yaw:NaN},[],()=>0));
 assert(!validHandoff(landing,[],()=>NaN));
 assert(!validHandoff(landing,[{kind:'circle',x:117,z:-70,radius:1}],()=>0));
 assert(!validHandoff(landing,[{kind:'box',x:117,z:-70,halfWidth:1,halfDepth:.1}],()=>0));
});

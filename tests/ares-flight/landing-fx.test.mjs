import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LandingDust,dustEnvelope,dustPuff} from '../../src/core/mars/exploration/flight/landing-fx.mjs';
test('validated touchdown produces one anchored burst, ends in five seconds, rearms on takeoff',()=>{
 const fx=new LandingDust();
 const input={height:1,descending:true,contact:false,x:10,z:20};
 assert.equal(fx.step(.1,input),0);assert.ok(fx.step(.1,{...input,contact:true})>0);
 for(let i=0;i<60;i++)fx.step(.1,{...input,contact:true,x:50});
 assert.equal(fx.events,1);assert.equal(fx.age,5);assert.equal(fx.x,10);assert.equal(fx.step(.1,input),0);
 fx.step(.1,{...input,height:10,descending:false});
 assert.ok(fx.step(.1,{...input,contact:true})>0);
});
test('contact alone triggers dust and deterministic plumes remain bounded',()=>{
 const fx=new LandingDust();assert.ok(fx.step(.1,{height:2,descending:false,contact:true,x:0,z:0})>0);
 assert.equal(dustEnvelope(5),0);assert.equal(dustEnvelope(100),0);
 for(let i=0;i<20;i++)for(const t of [0,2,5]){const p=dustPuff(i,t);assert.deepEqual(p,dustPuff(i,t));assert.ok(Math.hypot(p.x,p.z)<17);assert.ok(p.lift<3);}
});

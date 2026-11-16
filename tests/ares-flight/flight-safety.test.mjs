import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FlightV2,emptyInput} from '../../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
const tick=(f,s,input=emptyInput())=>{for(let t=0;t<s;t+=1/60)f.integrate(1/60,input);};
test('ground policy forbids landing and <=5m pad AGL; high overflight has no infinite wall',()=>{
 const f=new FlightV2(()=>0);assert(!f.inspect(-44,-68).valid);
 assert(!f.airClear(-44,-68,10.15));assert(f.airClear(-44,-68,10.16));assert(f.airClear(-44,-68,100));
 f.obstacles=[{kind:'box',x:-44,z:-68,halfWidth:14,halfDepth:18,groundOnly:true}];assert(f.airClear(-44,-68,100));
 delete f.obstacles[0].groundOnly;assert(!f.airClear(-44,-68,1000));
});
test('Command Hub height is solid, including flight beneath bounds; real terrain and perimeter remain solid',()=>{
 const f=new FlightV2(()=>12,[{kind:'box',x:-44,z:-68,halfWidth:14,halfDepth:18,topY:42}]);
 assert(!f.airClear(-44,-68,45));assert(f.airClear(-44,-68,51));
 assert(!f.airClear(110,-70,17));assert(!f.airClear(601,-70,100));
});
for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])test(`manual Ares crossing ${dx}/${dz} retains altitude and steering`,()=>{
 const f=new FlightV2(()=>0,[{kind:'box',x:-44,z:-68,halfWidth:14,halfDepth:18,topY:30}]);
 f.x=-44-dx*70;f.z=-68-dz*70;f.y=70;f.yaw=0;
 const input={...emptyInput(),lateral:dx,forward:-dz};tick(f,15,input);
 assert((f.x+44)*dx+(f.z+68)*dz>50);assert.equal(f.y,70);assert.equal(f.status,'MANUAL');
 const yaw=f.yaw;tick(f,.3,{...input,yaw:1});assert(f.yaw>yaw);
});
test('sweep prevents tunneling through a real structure',()=>{
 const f=new FlightV2(()=>0,[{kind:'box',x:145,z:-70,halfWidth:.1,halfDepth:20,topY:100}]);tick(f,20,{...emptyInput(),lateral:1});assert(f.x<145);assert(f.x>110);
});
test('G 16.7m holds for gear then makes four-pad vertical touchdown without ascent',()=>{
 const f=new FlightV2(()=>0);f.y=21.85;f.toggleGear();const {x,y,z}=f;tick(f,2.9);assert.equal(f.y,y);tick(f,55);assert.equal(f.status,'LANDED');assert.equal(f.x,x);assert.equal(f.z,z);assert.equal(f.support.heights.length,4);
});
test('F recovers G unsafe protected-area HOLD and completes safe-site descent',()=>{
 const f=new FlightV2(()=>0);f.x=20;f.z=-20;f.y=21.85;f.toggleGear();tick(f,4);assert.equal(f.status,'LANDING ABORTED');assert.equal(f.y,21.85);assert(!f.support.valid);
 f.requestTouchdown();assert(!f.assist);assert.equal(f.phase,'SEARCH');tick(f,60);assert.equal(f.status,'LANDED');assert(f.support.valid);assert(f.touchdownSeconds<=60);
});
test('manual overflight at 14m does not force autopilot; descending at 10m deploys',()=>{
 const f=new FlightV2(()=>0);f.y=19.15;f.step(0);f.step(20);assert.equal(f.status,'MANUAL');f.y=15.15;f.vy=-1;tick(f,.1,{...emptyInput(),vertical:-1});assert.equal(f.gear.state,'DEPLOYING');assert(f.y<=15.15 && f.y>14.8);
});
// Legacy third-party GLB test removed. FirstPartySpacecraft is covered by active flight geometry tests.
test('xenon real beam has bounded power, blue spectrum and widening descent footprint',async()=>{
 const {xenonBeam,UNDERGLOW}=await import('../../src/core/mars/exploration/flight/spacecraft-lighting.mjs');assert.equal(UNDERGLOW.color,'#65BEFF');
 const heights=[65,40,20,10,0],beams=heights.map(h=>xenonBeam(h));
 for(let i=0;i<beams.length;i++){assert(beams[i].intensity<=18000);assert(beams[i].intensity>200);assert(beams[i].distance>Math.hypot(heights[i]+2.55,beams[i].radius));if(i)assert(beams[i].radius>beams[i-1].radius);}
});

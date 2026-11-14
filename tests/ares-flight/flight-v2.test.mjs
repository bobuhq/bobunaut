import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FlightV2,FLIGHT_ZONE,VEHICLE_RADIUS,KEYMAP,emptyInput} from '../../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
const flat=()=>0;
function run(f,seconds,input=emptyInput(),start=0){f.step(start,input);for(let t=start+20;t<=start+seconds*1000+.1;t+=20)f.step(t,input);}
test('500m radius and full footprint, boundary rejects movement without teleport',()=>{const f=new FlightV2(flat);assert.equal(FLIGHT_ZONE.radius,500);assert(f.inside(110+500-VEHICLE_RADIUS,-70));assert(!f.inside(601,-70));f.x=599;f.vx=16;run(f,2,{...emptyInput(),lateral:1});assert(f.x<=600);assert(f.x>=599);});
test('desktop map and analog/mobile axes use same physics',()=>{assert.deepEqual(KEYMAP.KeyW,['forward',1]);assert.deepEqual(KEYMAP.ShiftRight,['vertical',-1]);for(const field of ['forward','lateral','vertical','yaw']){const f=new FlightV2(flat),old=[f.x,f.y,f.z,f.yaw];run(f,1,{...emptyInput(),[field]:1});assert.notDeepEqual([f.x,f.y,f.z,f.yaw],old);}const f=new FlightV2(flat);run(f,10,{...emptyInput(),lateral:1,vertical:-1});assert(Math.hypot(f.vx,f.vz)<=16);assert(f.vy>=-4);});
test('monotonic active timer pauses on hidden, blur and long suspension',()=>{const f=new FlightV2(flat);run(f,1);const a=f.activeSeconds;f.step(100000,emptyInput(),false);f.step(200000);assert.equal(f.activeSeconds,a);f.step(300000);assert.equal(f.activeSeconds,a);f.step(300020);assert(Math.abs(f.activeSeconds-a-.02)<1e-6);});
test('unsafe slope, relief, independent feet, obstacles and bounds rejected',()=>{assert(!new FlightV2((x)=>x).inspect(110,-70).valid);assert(!new FlightV2((x,z)=>Math.abs(x-116)<.1&&Math.abs(z+64)<.1?2:0).inspect(110,-70).valid);assert(!new FlightV2(flat,[{kind:'circle',x:110,z:-70,radius:2}]).inspect(110,-70).valid);assert(!new FlightV2(()=>NaN).inspect(110,-70).valid);assert(!new FlightV2(flat,[],100).inside(110,-70));});
test('verified four-pad landing locks gear, settles and fades engines',()=>{const f=new FlightV2(flat);f.requestTouchdown();run(f,100);assert.equal(f.status,'LANDED');assert.equal(f.gear.state,'SETTLED');assert.equal(f.power,0);assert.deepEqual([f.vx,f.vy,f.vz],[0,0,0]);assert.equal(f.support.heights.length,4);});
test('no safe site means holding, never forced touchdown',()=>{const f=new FlightV2((x)=>x);f.requestTouchdown();run(f,70);assert(['LANDING ABORTED'].includes(f.status));assert.equal(f.target,null);assert.notEqual(f.gear.state,'SETTLED');});
test('auto takeover redeploys gear if triggered during retraction',()=>{const f=new FlightV2(flat);f.toggleGear();run(f,3.2);f.toggleGear();f.requestTouchdown();run(f,100,emptyInput(),3200);assert.equal(f.status,'LANDED');assert.equal(f.gear.state,'SETTLED');});
test('flight crosses known low rocks at altitude but cannot land on them',()=>{const f=new FlightV2(flat,[{kind:'circle',x:130,z:-70,radius:1,height:2}]);assert(f.airClear(130,-70,40));assert(!f.airClear(130,-70,6));assert(!f.inspect(130,-70).valid);});
test('manual flight has no timed or proximity takeover; F explicitly engages safe landing',()=>{
 const f=new FlightV2(flat);f.y=20;run(f,65);assert.equal(f.status,'MANUAL');assert.equal(f.trigger,'');
 f.requestTouchdown();assert.equal(f.trigger,'F / TOUCHDOWN');run(f,100,emptyInput(),65000);assert.equal(f.status,'LANDED');
});
test('G deploys locked gear before vertical descent and settles without lateral movement',()=>{
 const f=new FlightV2(flat);const {x,y,z}=f;f.toggleGear();run(f,2.9);assert.equal(f.y,y);assert.equal(f.gear.state,'DEPLOYING');
 run(f,100,emptyInput(),2900);assert.equal(f.status,'LANDED');assert.equal(f.gear.state,'SETTLED');assert.equal(f.x,x);assert.equal(f.z,z);
});

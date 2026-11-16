import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadTs,buildings,terrainAt,hubFloor} from './campus-fixture.mjs';
import {createCampusTraversal} from '../../src/core/mars/exploration/separate-v11/campus-traversal.mjs';
const {createCampusExperience,DoorPassageSensor}=loadTs('src/core/mars/exploration/separate-v11/campus-experience.ts');
const {createCampusMusicSamples}=loadTs('src/core/mars/exploration/audio/CampusMusicSynthesis.ts');
const {AresArrivalSound}=loadTs('src/core/mars/exploration/audio/AresArrivalSound.ts');
const {AresInteriorMusic}=loadTs('src/core/mars/exploration/audio/AresInteriorMusic.ts');
class Param{value=0;events=[];setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.value=v;this.events.push(['ramp',v,t]);}exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exponential',v,t]);}setTargetAtTime(v,t,c){this.value=v;this.events.push(['target',v,t,c]);}cancelScheduledValues(t){this.events.push(['cancel',t]);}}
class Node{disconnected=false;connections=[];gain=new Param();frequency=new Param();Q=new Param();playbackRate=new Param();positionX=new Param();positionY=new Param();positionZ=new Param();connect(n){this.connections.push(n);return n;}disconnect(){this.disconnected=true;}}
class Source extends Node{buffer=null;loop=false;starts=[];stops=[];onended=null;start(t=0){this.starts.push(t);}stop(t=0){this.stops.push(t);}}
class Context{static instances=[];state='running';currentTime=0;destination=new Node();listener={positionX:new Param(),positionY:new Param(),positionZ:new Param(),forwardX:new Param(),forwardY:new Param(),forwardZ:new Param(),upX:new Param(),upY:new Param(),upZ:new Param()};sources=[];nodes=[];buffers=[];constructor(){Context.instances.push(this);}createGain(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){const s=new Source();s.kind='buffer';this.sources.push(s);this.nodes.push(s);return s;}createOscillator(){const s=new Source();s.kind='oscillator';this.sources.push(s);this.nodes.push(s);return s;}createBiquadFilter(){return this.createGain();}createPanner(){return this.createGain();}createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));const b={duration:length/rate,numberOfChannels:channels,getChannelData:c=>data[c]};this.buffers.push(b);return b;}async decodeAudioData(bytes){const v=new DataView(bytes);const rate=v.getUint32(24,true),length=v.getUint32(40,true)/2;return this.createBuffer(1,length,rate);}
async resume(){this.state='running';}async close(){this.state='closed';}}
const musicFetch=async()=>{const b=readFileSync(new URL('../../public/audio/ares-campus-original/campus-interior-original.wav',import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('both physical doorway passages open/close once in each direction and do not retrigger while standing',()=>{
 const model=createCampusTraversal(buildings,terrainAt,hubFloor),exp=createCampusExperience(model,buildings,hubFloor),sensors=exp.doors.map(d=>new DoorPassageSensor(d));let time=0;const events=sensors.map(()=>[]);
 const tick=(x,z)=>{time+=1/60;sensors.forEach((s,i)=>{const v=s.update(x,z,time);if(v!==null)events[i].push(v);});};
 const move=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3*60);for(let i=0;i<=n;i++)tick(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n);};
 const path=[[-40,-71],[-40,-80],[-40,-93.5],[-7,-93.5],[-7,-82]];
 tick(...path[0]);for(let k=1;k<path.length;k++)move(path[k-1],path[k]);for(let i=0;i<120;i++)tick(...path.at(-1));
 for(const e of events)assert.deepEqual(e,[true,false]);
 for(let k=path.length-1;k>0;k--)move(path[k],path[k-1]);for(let i=0;i<120;i++)tick(...path[0]);for(const e of events)assert.deepEqual(e,[true,false,true,false]);
 const sensor=new DoorPassageSensor(exp.doors[0]);assert.equal(sensor.update(-40,-76.55,0),null,'initial page at doorway never queues audio');for(let i=1;i<=300;i++)assert.equal(sensor.update(-40,-76.55+(i%2?2.3:2.8),i/60),null,'hysteresis prevents edge chatter');
});
test('original ambient loop has non-silent finite PCM, a quiet peak and a seamless cyclic endpoint',()=>{
 const data=createCampusMusicSamples(),again=createCampusMusicSamples();assert.equal(data.length,22050*32);assert.deepEqual(data,again);
 let squares=0,peak=0,maxDelta=0;for(let i=0;i<data.length;i++){assert.ok(Number.isFinite(data[i]));squares+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));if(i)maxDelta=Math.max(maxDelta,Math.abs(data[i]-data[i-1]));}
 assert.ok(Math.sqrt(squares/data.length)>.01);assert.ok(peak<.4);assert.ok(Math.abs(data[0]-data.at(-1))<maxDelta*1.5,'no seam click beyond normal neighbouring sample slope');
 const wav=readFileSync(new URL('../../public/audio/ares-campus-original/campus-interior-original.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.length,44+data.length*2);
 for(let i=0;i<data.length;i+=73)assert.equal(wav.readInt16LE(44+i*2),(Math.round(data[i]*32767)||0),'bundled review asset matches runtime composition');
});
test('music fades on one persistent source without restarting at room boundaries or re-entry',async()=>{
 const savedFetch=globalThis.fetch;globalThis.fetch=musicFetch;
 const c=new Context(),music=new AresInteriorMusic(c);music.setInside(true);await music.ready;globalThis.fetch=savedFetch;const source=c.sources[0];assert.equal(source.starts.length,1);assert.equal(source.loop,true);
 music.setInside(true);for(let i=0;i<40;i++)music.setInside(true);music.setInside(false);music.setInside(true);
 assert.equal(source.starts.length,1);const gain=source.connections[0].gain;
 assert.deepEqual(gain.events.filter(e=>e[0]==='target').map(e=>e[1]),[.32,0,.32]);assert.ok(gain.events.filter(e=>e[0]==='target').every(e=>e[3]>=.5));music.dispose();assert.ok(source.stops.length);assert.equal(source.buffer,null);
});
test('ARES audio waits for interaction, deduplicates door cues, respects mute and releases the shared context',async()=>{
 const globals={};for(const name of ['window','document','localStorage','Element','KeyboardEvent','fetch'])globals[name]=Object.getOwnPropertyDescriptor(globalThis,name);
 const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';win.AudioContext=Context;globalThis.window=win;globalThis.document=doc;Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>null,setItem:()=>{}},writable:true,configurable:true});globalThis.Element=class{};globalThis.KeyboardEvent=class{};globalThis.fetch=async url=>String(url).includes('ares-campus-original')?musicFetch():{ok:false};
 let detach;const sound=new AresArrivalSound();Context.instances=[];
 try{
  sound.routeChanged('/mars/explore');detach=sound.attachSurface();sound.setMusicInterior('v12-interior-complex',true);await wait(5);
  assert.equal(Context.instances.length,0,'surface commit and interior detection cannot autoplay');
  sound.onInteraction({isTrusted:false,target:null});assert.equal(Context.instances.length,0);
  sound.onInteraction({isTrusted:true,target:null});await wait(10);const c=Context.instances[0];assert.ok(c);assert.equal(Context.instances.length,1);
  const loops=()=>c.sources.filter(s=>s.loop&&s.buffer?.duration===32);assert.equal(loops().length,1);
  for(let i=0;i<10;i++){sound.setMusicInterior('v12-interior-complex',true);sound.setInterior(false);}assert.equal(loops().length,1,'original Hub mix cannot restart campus music');
  const doorVoices=()=>c.sources.filter(s=>!s.loop&&s.buffer&&[.8,.42,1.1].some(n=>Math.abs(s.buffer.duration-n)<.001));
  sound.door('v12-hub-rear',true,[-40,11,-76.55]);assert.equal(doorVoices().length,2,'mechanical slide + pneumatic layer');
  for(let i=0;i<30;i++)sound.door('v12-hub-rear',true,[-40,11,-76.55]);assert.equal(doorVoices().length,2);
  sound.door('v12-hub-rear',false,[-40,11,-76.55]);assert.equal(c.sources.filter(s=>s.kind==='buffer'&&!s.loop&&s.starts.length).length,4);
  sound.door('v12-genesis-rear',true,[-7,11,-87.4]);sound.door('v12-genesis-rear',false,[-7,11,-87.4]);assert.equal(c.sources.filter(s=>s.kind==='buffer'&&!s.loop&&s.starts.length).length,8);
  const musicSource=loops()[0];sound.setMusicInterior('v12-interior-complex',false);assert.equal(musicSource.connections[0].gain.value,0);sound.setMusicInterior('v12-interior-complex',true);assert.equal(loops().length,1);
  sound.primeDoor('spawn-at-threshold',true);const prior=c.sources.length;sound.door('spawn-at-threshold',false,[-40,11,-76.55]);assert.equal(c.sources.length,prior+2,'an initially open door still gets its real closing cue');
  sound.setListener(-40,12,-77,0,0,-1);assert.equal(c.listener.positionX.value,-40);
  sound.setEnabled(false);const count=c.sources.length;sound.door('v12-hub-rear',true,[-40,11,-76.55]);assert.equal(c.sources.length,count,'muted door changes are consumed silently');
  await wait(230);assert.equal(c.state,'closed');assert.ok(c.sources.every(s=>s.stops.length));
  sound.setEnabled(true);await wait(10);const resumed=Context.instances.at(-1);assert.notEqual(resumed,c);
  sound.door('v12-hub-rear',true,[-40,11,-76.55]);assert.equal(resumed.sources.filter(s=>s.kind==='buffer'&&!s.loop).length,0,'unmute never replays an old doorway cue');
  sound.routeChanged('/');
 }finally{detach?.();sound.routeChanged('/');await wait(230);for(const [name,value] of Object.entries(globals)){if(value===undefined)delete globalThis[name];else Object.defineProperty(globalThis,name,value);}}
});
test('existing original mechanical and pneumatic buffers retain their exact pre-polish samples',()=>{
 const expected={"door":"3e99dc0e752bf9a3bc0aaae7649b7a0637b714dd2f266eac69319cb533d4b17b","seal":"8000f92a18edcda172ad3a80df9ef04a72b1a1c25ee521286cffd31bf6352fac","pressure":"749bf9db9ea65c835ba99f31d3b238bc6cf549bf878e2bb76d06b1405e64be1c"};
 const sound=new AresArrivalSound();sound.context=new Context();
 for(const key of ['door','seal','pressure'])assert.equal(createHash('sha256').update(sound.doorBuffer(key).getChannelData(0)).digest('hex'),expected[key],key+' unchanged, including shared flight cues');
});
test('a late local music decode cannot start after mute or surface cleanup',async()=>{
 const savedFetch=globalThis.fetch;globalThis.fetch=musicFetch;
 try{
  const c=new Context();let resolveDecode;
  c.decodeAudioData=()=>new Promise(resolve=>{resolveDecode=resolve;});
  const music=new AresInteriorMusic(c);music.setInside(true);await wait(1);assert.ok(resolveDecode);
  music.fadeOut();music.dispose();resolveDecode(c.createBuffer(1,32*22050,22050));await music.ready;
  assert.equal(c.sources.length,0,'no late looping source after cancellation');
 }finally{globalThis.fetch=savedFetch;}
});

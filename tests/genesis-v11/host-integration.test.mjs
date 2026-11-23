import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import {loadTs,sampler,terrain} from '../genesis-v12/campus-fixture.mjs';

const movement=loadTs('src/core/mars/exploration/engine/MarsCharacterMovement.ts');
const hubSurface=loadTs('src/core/mars/exploration/commandhub/AresCommandHubWalkableSurface.ts');
const hubCollision=loadTs('src/core/mars/exploration/commandhub/AresCommandHubCollision.ts');
const {MarsCameraClearance}=loadTs('src/core/mars/exploration/components/MarsCameraClearance.ts');
function mount(file,name,props,dependencies={}){
 const callbacks=[],effects=[],listeners=new Map(),exports={};
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,2,6);
 const pointerListeners=new Map();
 const element={style:{},addEventListener:(type,fn)=>pointerListeners.set(type,fn),removeEventListener(){}};
 const document={hidden:false,pointerLockElement:null,addEventListener(){},removeEventListener(){}};
 const code=ts.transpileModule(readFileSync('src/core/mars/exploration/components/'+file,'utf8').replaceAll('import.meta.env.DEV', 'false'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const window={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener(){},matchMedia:()=>({matches:false})};
 vm.runInNewContext(code,{exports,window,document,console,require:id=>{
  if(id==='react')return {useRef:value=>({current:value}),useEffect:fn=>effects.push(fn),
   useCallback:fn=>fn,useState:value=>[value,()=>{}]};

  if(id==='react/jsx-runtime'){const jsx=(type,props)=>({type,props});return {jsx,jsxs:jsx};}
  if(id==='three')return THREE;
  if(id==='../engine/aresPerformance')return {markAresStage(){},startAresStage(){}};
  if(id==='./MarsCameraClearance')return {
    MarsCameraClearance: class {
      refresh() {}
      solve(look, eye) { return eye.distanceTo(look); }
    },
    followCameraRadius: (current, target) => target,
  };
  if(id==='@react-three/fiber')return {useFrame:fn=>callbacks.push(fn),useThree:()=>({camera,gl:{domElement:element}})};
  if(id in dependencies)return dependencies[id];
  throw Error('Unmocked dependency: '+id);
 }});
 const rendered=exports[name](props);for(const effect of effects)effect();
 return {camera,frame:(delta=1/60)=>callbacks.forEach(fn=>fn({camera},delta)),listeners,pointerListeners,element,document,rendered};
}
test('actual controller adds campus floors and preserves original ground on absent/invalid input',async()=>{
 const group=new THREE.Group();group.position.set(-516,0,-213);
 let floor=10;
 const mounted=mount('BobuCharacterController.tsx','BobuCharacterController',{characterRef:{current:group},walkableSurface:()=>floor},{
  '../engine/AresGenesisTerrainData':{ARES_GENESIS_SAFE_BOUNDARY_METERS:6350,loadAresGenesisTerrainData:async()=>({}),sampleAresGenesisRenderedSurfaceMeters:()=>2},
  '../commandhub/AresCommandHubWalkableSurface':{isAresCommandHubStairPosition:()=>false,isInsideHubFloor:()=>false,sampleAresCommandHubWalkableSurfaceMeters:()=>null},
  '../engine/MarsCharacterMovement':{createEmptyMarsMovementInput:()=>({}),getMarsMovementDirection:()=>new THREE.Vector3(),getMarsFacingAngle:()=>0},
 });
 await Promise.resolve();mounted.frame();assert.equal(group.position.y,10.09);
 floor=null;mounted.frame();assert.equal(group.position.y,2.09);
 floor=NaN;mounted.frame();assert.equal(group.position.y,2.09);
 assert.equal(group.position.x,-516);assert.equal(group.position.z,-213);
});
test('actual follow camera constrains the final eye position after smoothing',()=>{
 const group=new THREE.Group();group.position.set(-516,10,-213);let constrained=0;
 const mounted=mount('MarsFollowCamera.tsx','MarsFollowCamera',{targetRef:{current:group},interiorAt:()=>true,constrainCamera:(look,eye)=>{constrained++;assert.equal(look.x,-516);eye.copy(look).add(new THREE.Vector3(0,0,1));}},{'../commandhub/AresCommandHubCollision':{ARES_COMMAND_HUB_POSITION:{x:-44,z:-68},ARES_COMMAND_HUB_WIDTH:16,ARES_COMMAND_HUB_DEPTH:18}});
 mounted.frame();assert.equal(constrained,1);assert.equal(mounted.camera.position.x,-516);assert.equal(mounted.camera.position.z,-212);
});
test('actual controller consumes the integrated campus paving sampled from shipped ARES terrain',async()=>{
 const {collectGenesisSourceEvidence}=await import('../../scripts/genesis-source-evidence.mjs');
 const {prepareIntegratedCampus,integratedCampusFloor,integratedReservations,HUB_PLACEMENT,INTEGRATED_LAYOUT}=await import('../../src/core/mars/exploration/genesis-v5/integrated-campus.mjs');
 const {sourceGeometry:g}=collectGenesisSourceEvidence({includeGeometry:true});
 const site=prepareIntegratedCampus({layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),legalRegions:integratedReservations(),occupied:[...g.fixed,...g.observedBuildings,...g.observedMissions],protectedRoutes:[],reservedCells:[],occupancyComplete:true,routesReserved:true,placementReserved:true,sample:g.sample});
 const group=new THREE.Group();group.position.set(-44,0,-47);
 const mounted=mount('BobuCharacterController.tsx','BobuCharacterController',{characterRef:{current:group},collisionObstacles:site.obstacles,walkableSurface:(_,x,z)=>integratedCampusFloor(site,x,z)},{
  '../engine/AresGenesisTerrainData':{ARES_GENESIS_SAFE_BOUNDARY_METERS:6350,loadAresGenesisTerrainData:async()=>({}),sampleAresGenesisRenderedSurfaceMeters:(_,x,z)=>g.sample(x,z)},
  '../commandhub/AresCommandHubWalkableSurface':{isAresCommandHubStairPosition:()=>false,isInsideHubFloor:()=>false,sampleAresCommandHubWalkableSurfaceMeters:()=>null},
  '../engine/MarsCharacterMovement':{createEmptyMarsMovementInput:()=>({}),getMarsMovementDirection:()=>new THREE.Vector3(),getMarsFacingAngle:()=>0},
 });
 await Promise.resolve();mounted.frame();assert.equal(group.position.y,g.sample(-44,-47)+.035+.09);
 assert.equal(group.position.x,-44);assert.equal(group.position.z,-47);
});

function mountCharacter(group, props = {}, terrainSampler = sampler) {
 return mount('BobuCharacterController.tsx','BobuCharacterController',{
  characterRef:{current:group},terrainData:terrain,...props,
 },{
  '../engine/AresGenesisTerrainData':terrainSampler,
  '../commandhub/AresCommandHubWalkableSurface':hubSurface,
  '../engine/MarsCharacterMovement':movement,
 });
}

test('the shipped Hub floor supports BOBU where the terrain rises above the slab',()=>{
 const group=new THREE.Group();
 const renderedFloor=sampler.sampleAresGenesisGameplaySurfaceMeters(terrain,-44,-68)+.05+.01;
 const mounted=mountCharacter(group,{collisionObstacles:hubCollision.ARES_COMMAND_HUB_COLLISION_OBSTACLES});
 for(const [x,z] of [[-44,-68],[-50,-75],[-38,-70]]){
  group.position.set(x,0,z);
  mounted.frame();
  assert.ok(Math.abs(group.position.y-renderedFloor-.09)<1e-12);
 }
 assert.ok(sampler.sampleAresGenesisRenderedSurfaceMeters(terrain,-50,-75)>renderedFloor+.5);
});

test('stationary and vertically jumping BOBU reuse the terrain footprint',()=>{
 const group=new THREE.Group();
 let samples=0;
 const mounted=mountCharacter(group,{},{
  ...sampler,
  sampleAresGenesisRenderedSurfaceMeters(...args){
   samples++;
   return sampler.sampleAresGenesisRenderedSurfaceMeters(...args);
  },
 });
 mounted.frame();
 assert.equal(samples,5);
 mounted.frame();
 mounted.listeners.get('keydown')({code:'Space',preventDefault(){}});
 mounted.frame();
 assert.equal(samples,5);
 group.position.x+=1;
 mounted.frame();
 assert.equal(samples,10);
});

test('a delayed frame bounds walking displacement and still checks Hub wall collision',()=>{
 const group=new THREE.Group();
 group.position.set(-37.09,0,-68);
 const mounted=mountCharacter(group,{collisionObstacles:hubCollision.ARES_COMMAND_HUB_COLLISION_OBSTACLES});
 mounted.listeners.get('keydown')({code:'KeyD',preventDefault(){}});
 mounted.frame(2);
 assert.ok(group.position.x<=-37.03,'right wall clearance is preserved');
 mounted.listeners.get('keyup')({code:'KeyD',preventDefault(){}});
 group.position.set(0,0,0);
 mounted.listeners.get('keydown')({code:'KeyW',preventDefault(){}});
 mounted.frame(2);
 assert.ok(
    Math.abs(
      group.position.z +
      movement.DEFAULT_MARS_MOVEMENT_CONFIG.walkSpeed * 0.05
    ) < 1e-12,
    'long stalls preserve bounded walking displacement'
  );
});

test('orbit uses the captured pointer and actual client motion outside pointer lock',()=>{
 const {camera,frame,pointerListeners}=mount('MarsFollowCamera.tsx','MarsFollowCamera',{
  targetRef:{current:new THREE.Group()},
 },{'../commandhub/AresCommandHubCollision':hubCollision});
 const send=(type,props={})=>pointerListeners.get(type)({
  pointerId:1,pointerType:'mouse',button:0,buttons:1,clientX:100,clientY:100,movementX:800,movementY:600,...props,
 });
 send('pointerdown');
 send('pointermove');
 send('pointermove',{pointerId:2,clientX:300});
 frame();
 assert.equal(camera.position.x,0);
 send('pointermove',{clientX:140});
 frame();
 assert.ok(camera.position.x<0,'intentional mouse drag orbits');
 send('lostpointercapture');
 const position=camera.position.clone();
 frame();
 const settling=camera.position.x-position.x;
 send('pointermove',{clientX:400});
 const previous=camera.position.x;
 frame();
 assert.ok(Math.abs(camera.position.x-previous)<Math.abs(settling),'only ordinary smoothing remains');
});

test('a single-sided surface behind the look target cannot collapse the camera boom',()=>{
 const scene=new THREE.Scene();
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());
 panel.position.z=-.1;
 scene.add(panel);
 const clearance=new MarsCameraClearance();
 clearance.refresh([scene]);
 const look=new THREE.Vector3();
 const eye=new THREE.Vector3(0,0,4);
 assert.equal(clearance.clamp(look,eye),4);
 panel.position.z=2;
 assert.ok(Math.abs(clearance.clamp(look,eye)-1.78)<1e-12,'reverse rays still catch front faces pointing toward the eye');
});

test('camera refresh reuses static instance bounds and updates changed instances',()=>{
 const scene=new THREE.Scene();
 const windowMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(2,2,.1),new THREE.MeshBasicMaterial(),1);
 windowMesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,0,2));
 scene.add(windowMesh);
 const compute=windowMesh.computeBoundingBox.bind(windowMesh);
 let boundsUpdates=0;
 windowMesh.computeBoundingBox=()=>{boundsUpdates++;compute();};
 const clearance=new MarsCameraClearance();
 const look=new THREE.Vector3();
 const eye=new THREE.Vector3(0,0,4);
 clearance.refresh([scene]);
 clearance.refresh([scene]);
 assert.equal(boundsUpdates,1);
 assert.ok(clearance.clamp(look,eye.clone())<2);
 windowMesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(4,0,2));
 windowMesh.instanceMatrix.needsUpdate=true;
 clearance.refresh([scene]);
 assert.equal(boundsUpdates,2);
 assert.equal(clearance.clamp(look,eye),4);
});

test('movement refreshes nearby collision candidates before a sweep leaves its cached area',()=>{
 const group=new THREE.Group();
 const mounted=mountCharacter(group,{
  collisionObstacles:[{kind:'circle',x:0,z:-6,radius:1}],
 });
 mounted.listeners.get('keydown')({code:'KeyW',preventDefault(){}});
 for(let step=0;step<30;step++)mounted.frame(.05);
 assert.ok(group.position.z<=-4.4 && group.position.z>=-4.52);
});

test('joystick clears movement when capture is lost and ignores unrelated pointers',()=>{
 const vectors=[];
 const {rendered,listeners}=mount('AresMobileJoystick.tsx','AresMobileJoystick',{
  onMove:({x,y})=>vectors.push([x,y]),
 },{'../audio/MarsAudioEngine':{marsAudio:{step(){}}}});
 const base=rendered.props.children.props;
 let captured=null;
 const element={
  getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),
  setPointerCapture:id=>{captured=id;},
  hasPointerCapture:id=>captured===id,
  releasePointerCapture:()=>{captured=null;},
 };
 base.ref.current=element;
 const event={currentTarget:element,pointerId:1,button:0,clientX:92,clientY:50,preventDefault(){},stopPropagation(){}};
 base.onPointerDown(event);
 base.onPointerDown({...event,pointerId:2,clientX:8});
 base.onLostPointerCapture({...event,pointerId:2});
 assert.deepEqual(vectors,[[1,0]]);
 captured=null;
 base.onLostPointerCapture(event);
 base.onPointerMove(event);
 assert.deepEqual(vectors,[[1,0],[0,0]]);
 base.onPointerDown(event);
 listeners.get('blur')();
 assert.deepEqual(vectors.at(-1),[0,0]);
 assert.equal(captured,null);
});

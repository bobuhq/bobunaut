import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
function mount(file,name,props,dependencies={}){
 const callbacks=[],effects=[],listeners=new Map(),exports={};
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,2,6);
 const element={style:{},addEventListener(){},removeEventListener(){}};
 const code=ts.transpileModule(readFileSync('src/core/mars/exploration/components/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const window={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener(){},matchMedia:()=>({matches:false})};
 vm.runInNewContext(code,{exports,window,console,require:id=>{
  if(id==='react')return {useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)};
  if(id==='react/jsx-runtime')return {jsx:(type,props)=>({type,props})};
  if(id==='three')return THREE;
  if(id==='@react-three/fiber')return {useFrame:fn=>callbacks.push(fn),useThree:()=>({camera,gl:{domElement:element}})};
  if(id in dependencies)return dependencies[id];
  throw Error('Unmocked dependency: '+id);
 }});
 exports[name](props);for(const effect of effects)effect();
 return {camera,frame:()=>callbacks.forEach(fn=>fn({camera},1/60)),listeners};
}
test('actual controller adds campus floors and preserves original ground on absent/invalid input',async()=>{
 const group=new THREE.Group();group.position.set(-516,0,-213);
 let floor=10;
 const mounted=mount('BobuCharacterController.tsx','BobuCharacterController',{characterRef:{current:group},walkableSurface:()=>floor},{
  '../engine/AresGenesisTerrainData':{ARES_GENESIS_SAFE_BOUNDARY_METERS:6350,loadAresGenesisTerrainData:async()=>({}),sampleAresGenesisRenderedSurfaceMeters:()=>2},
  '../commandhub/AresCommandHubWalkableSurface':{isAresCommandHubStairPosition:()=>false,sampleAresCommandHubWalkableSurfaceMeters:()=>null},
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

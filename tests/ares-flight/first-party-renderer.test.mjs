import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPACECRAFT_CONTRACT as c,shellPositions,HULL_SECTIONS} from '../../src/core/mars/exploration/flight/first-party-spacecraft.mjs';
import {PILOT_EYE} from '../../src/core/mars/exploration/flight/spacecraft-v5-geometry.mjs';
import {FEET} from '../../src/core/mars/exploration/genesis-v5/landing-gear.mjs';
import {disembarkActorLocal,EXIT_DURATION} from '../../src/core/mars/exploration/flight/disembark-v1.mjs';
const source=p=>readFileSync(new URL('../../src/core/mars/exploration/flight/'+p,import.meta.url),'utf8');
test('first-party anchors match existing camera, stair endpoint and four gear links',()=>{
 assert.deepEqual(c.pilotEye,PILOT_EYE);const p=disembarkActorLocal(EXIT_DURATION);assert.deepEqual(c.exit,[p.x,p.y,p.z]);
 c.gearMounts.forEach((mount,i)=>mount.forEach((v,j)=>assert.ok(Math.abs(v-[FEET[i][0]*.65,-1,FEET[i][1]*.65][j])<1e-12)));
 assert.deepEqual(c.hatch,[3.22,-1.05,0]);assert.deepEqual(c.stairs,[3.3,0,0]);assert.equal(c.collisionRadius,10);
});
test('both independent shells are finite triangle meshes within the existing safety envelope',()=>{
 for(const rings of Object.values(HULL_SECTIONS)){
  const v=shellPositions(rings,{aft:rings===HULL_SECTIONS.aft});assert.ok(v.length>200);assert.equal(v.length%9,0);assert.ok(v.every(Number.isFinite));
  for(let i=0;i<v.length;i+=3)assert.ok(Math.hypot(v[i],v[i+2])<c.collisionRadius);
 }
});
test('starboard hatch bay has no sealed side triangle in either shell',()=>{
 for(const rings of Object.values(HULL_SECTIONS)){
  const v=shellPositions(rings,{aft:rings===HULL_SECTIONS.aft});
  for(let i=0;i<v.length;i+=9){const tri=[v.slice(i,i+3),v.slice(i+3,i+6),v.slice(i+6,i+9)];
   const midpoint=tri.reduce((s,p)=>s+p[2],0)/3;
   if(midpoint>-.95&&midpoint<.95)assert.ok(!tri.every(p=>p[0]>2.5),'door bay must remain open');
  }
 }
});
test('renderer preserves readiness and both modes without any model loader',()=>{
 const renderer=source('FirstPartySpacecraft.tsx'),integration=source('AresSpacecraft.tsx');
 assert.match(renderer,/interior\?:boolean;reflection:T.Texture;onReady\?:\(\)=>void/);
 assert.match(renderer,/onReady\?\.\(\)/);assert.match(renderer,/interior\?'ARES-first-party-interior':'ARES-first-party-exterior'/);
 assert.match(integration,/<FirstPartySpacecraft interior=\{cockpit\} reflection=\{reflection.texture\} exitActive=\{exitActive\} onReady=\{cockpit\?undefined:onExteriorReady\}/);
 assert.doesNotMatch(integration,/import.*SpacecraftGLBV61/);
 for(const file of ['FirstPartySpacecraft.tsx','AresSpacecraft.tsx','first-party-spacecraft.mjs'])assert.doesNotMatch(source(file),/useGLTF|GLTFLoader|\.glb|hodbin|wasp/i);
});
test('mounted exterior and interior build real geometry and signal readiness after commit',async()=>{
 const vm=await import('node:vm'),ts=await import('typescript'),T=await import('three');
 const geometry=await import('../../src/core/mars/exploration/flight/spacecraft-v5-geometry.mjs');
 const contract=await import('../../src/core/mars/exploration/flight/first-party-spacecraft.mjs');
 for(const [interior,exitActive] of [[false,false],[false,true],[true,false],[true,true]]){
  const effects=[],exports={},jsx=(type,props)=>({type,props});
  const code=ts.transpileModule(source('FirstPartySpacecraft.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>name==='three'?T:name==='react'?{useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)}:name.includes('jsx-runtime')?{jsx,jsxs:jsx}:name.includes('spacecraft-v5-geometry')?geometry:contract});
  let ready=0;const reflection=new T.Texture(),tree=exports.FirstPartySpacecraft({interior,exitActive,reflection,onReady:()=>ready++});assert.equal(ready,0);
  const nodes=[];function visit(node){if(!node)return;if(Array.isArray(node)){node.forEach(visit);return;}if(typeof node.type==='function'){visit(node.type(node.props));return;}nodes.push(node);visit(node.props?.children);}visit(tree);
  assert.equal(nodes.some(n=>n.type==='mesh'&&JSON.stringify(n.props.position)==='[3.22,-0.025,0]'),!exitActive);
  const meshes=nodes.filter(n=>n.type==='mesh'&&n.props.geometry);assert.ok(meshes.length>=6);
  for(const mesh of meshes){assert.ok(mesh.props.geometry.attributes.position.count>0);assert.ok(mesh.props.geometry.attributes.normal.count>0);}
  const finishes=nodes.filter(n=>n.type==='meshStandardMaterial');assert.ok(finishes.some(n=>n.props.metalness===.75&&n.props.envMap===reflection));assert.ok(finishes.some(n=>n.props.transparent&&n.props.depthWrite===false));
  const cleanups=effects.map(fn=>fn()).filter(fn=>typeof fn==='function');assert.equal(ready,1);cleanups.forEach(fn=>fn());reflection.dispose();
 }
});

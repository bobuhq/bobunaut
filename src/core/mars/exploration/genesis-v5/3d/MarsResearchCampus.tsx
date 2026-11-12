import { Suspense, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DeepSpaceRelay } from './DeepSpaceRelay';
import { BiodomeLighting } from './PremiumCampusExterior';
import { type CampusPlan, type CampusSite } from './campus-layout.mjs';

// Shared metric engineering kit. All transforms and batches are static.
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const crystal = new THREE.OctahedronGeometry(1, 0);
const shape = new THREE.Shape();
shape.moveTo(-.42,-.5);shape.lineTo(.42,-.5);shape.lineTo(.5,-.42);shape.lineTo(.5,.42);
shape.lineTo(.42,.5);shape.lineTo(-.42,.5);shape.lineTo(-.5,.42);shape.lineTo(-.5,-.42);shape.closePath();
const chassis = new THREE.ExtrudeGeometry(shape,{depth:.84,bevelEnabled:true,bevelSize:.04,bevelThickness:.08,bevelSegments:1,steps:1});
chassis.rotateX(-Math.PI/2);chassis.translate(0,-.42,0);
const metal = new THREE.MeshStandardMaterial({color:'#65767b',metalness:.45,roughness:.65});
const dark = new THREE.MeshStandardMaterial({color:'#283c45',metalness:.4,roughness:.72});
const pale = new THREE.MeshStandardMaterial({color:'#bac5be',metalness:.18,roughness:.72});
const cyan = new THREE.MeshStandardMaterial({color:'#499eac',emissive:'#227d8a',emissiveIntensity:.32,roughness:.6});
const emerald = new THREE.MeshBasicMaterial({color:'#66d5a2',toneMapped:false});
const purple = new THREE.MeshStandardMaterial({color:'#9f6ac5',emissive:'#58298a',emissiveIntensity:.48,metalness:.25,roughness:.4});
type Part = {p:[number,number,number];s:[number,number,number];yaw?:number};
function Batch({geometry,material,parts,name}:{geometry:THREE.BufferGeometry;material:THREE.Material;parts:Part[];name:string}) {
 const mesh=useMemo(()=>{
  const m=new THREE.InstancedMesh(geometry,material,parts.length),o=new THREE.Object3D();
  parts.forEach((p,i)=>{o.position.set(...p.p);o.scale.set(...p.s);o.rotation.set(0,p.yaw??0,0);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
  m.instanceMatrix.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();m.name=name;m.receiveShadow=true;m.castShadow=false;return m;
 },[geometry,material,parts,name]);
 useEffect(()=>()=>mesh.dispose(),[mesh]);
 return <primitive object={mesh} dispose={null}/>;
}
function CampusModel({site}:{site:CampusSite}) {
 const gltf=useLoader(GLTFLoader,'/mars/ares-genesis/campus/'+site.file);
 const scene=useMemo(()=>{const c=gltf.scene.clone(true);c.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.receiveShadow=true;}});c.updateMatrixWorld(true);return c;},[gltf]);
 return <group position={[site.x,site.deck,site.z]} scale={site.scale} dispose={null}><primitive object={scene}/>{site.beamColor ? <DeepSpaceRelay scene={scene} color={site.beamColor} phase={site.beamPhase}/> : (site.id==='comms' && <DeepSpaceRelay scene={scene}/>)}</group>;
}
function FacilityLabel({site}:{site:CampusSite}) {
 const kit=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;
  c.fillStyle='#182a32';c.fillRect(0,0,1024,256);c.fillStyle='#ad7bd2';c.fillRect(0,0,18,256);
  c.font='bold 46px sans-serif';c.fillStyle='#dae4dd';c.fillText(site.label,48,84);
  c.font='27px monospace';c.fillStyle='#60d7ab';c.fillText('BOBU GENESIS / RESEARCH CAMPUS',48,143);
  c.fillStyle='#9baeb5';c.font='24px monospace';c.fillText('EXTERIOR SYSTEM • SEALED / NO CREW ACCESS',48,199);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return {texture,material:new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),geometry:new THREE.PlaneGeometry(4.5,1.125)};
 },[site.label]);
 useEffect(()=>()=>{kit.texture.dispose();kit.material.dispose();kit.geometry.dispose();},[kit]);
 return <mesh position={[site.x+site.width/2+.012,site.deck+1.05,site.z]} rotation={[0,Math.PI/2,0]} geometry={kit.geometry} material={kit.material}/>;
}
export function MarsResearchCampus({plan}:{plan:CampusPlan}) {
 const kit=useMemo(()=>{
  const frames:Part[]=[],panels:Part[]=[],feet:Part[]=[],rails:Part[]=[],guides:Part[]=[],lights:Part[]=[],tanks:Part[]=[],cores:Part[]=[],collars:Part[]=[];
  for(const s of plan.sites){
   panels.push({p:[s.x,s.deck-.14,s.z],s:[s.width,.28,s.depth]});
   for(const f of s.feet){const bottom=f.ground-.12,top=s.deck-.22;feet.push({p:[f.x,(bottom+top)/2,f.z],s:[.32,top-bottom,.32]});collars.push({p:[f.x,f.ground+.02,f.z],s:[.65,.16,.65]});}
   for(const side of [-1,1]){
    frames.push({p:[s.x+side*(s.width/2-.25),s.deck-.22,s.z],s:[.24,.36,s.depth-.3]});
    frames.push({p:[s.x,s.deck-.22,s.z+side*(s.depth/2-.25)],s:[s.width-.3,.36,.24]});
    // Maintenance perimeter, entirely inside the sealed platform's collision envelope.
    for(const z of [-.38,0,.38])rails.push({p:[s.x+side*(s.width/2-.2),s.deck+.55,s.z+z*s.depth],s:[.07,1.1,.07]});
    rails.push({p:[s.x+side*(s.width/2-.2),s.deck+1.08,s.z],s:[.075,.065,s.depth*.8]});
    guides.push({p:[s.x+side*(s.width/2-.45),s.deck+.015,s.z],s:[.055,.035,s.depth*.78]});
   }
   // Outboard environmental plant: pressure vessels, heat exchanger fins and crystal bus.
   const x=s.x+s.width/2-1.05,z=s.z+s.depth/2-1.2;
   for(const dz of [-.55,.55]){tanks.push({p:[x,s.deck+.65,z+dz],s:[.35,1.3,.35]});collars.push({p:[x,s.deck+.08,z+dz],s:[.48,.16,.48]});}
   for(let i=0;i<6;i++)frames.push({p:[x-1.1,s.deck+.42,z-.7+i*.25],s:[.7,.75,.065]});
   const cx=s.x-s.width/2+1.15,cz=s.z+s.depth/2-1.2;
   collars.push({p:[cx,s.deck+.3,cz],s:[.65,.6,.65]},{p:[cx,s.deck+1.15,cz],s:[.4,.1,.4]});
   cores.push({p:[cx,s.deck+.85,cz],s:[.28,.65,.28],yaw:Math.PI/4});
   frames.push({p:[s.x+s.width/2-.12,s.deck+.92,s.z],s:[.18,1.85,5]});
   for(const dz of [-2.25,2.25])lights.push({p:[s.x+s.width/2+.015,s.deck+1.05,s.z+dz],s:[.035,.8,.055]});
  }
  // Flush segmented service markings follow the production terrain; no raised fake route.
  for(const p of plan.path){panels.push({p:[p.x,p.y-.035,p.z],s:[1.8,.09,.8]});guides.push({p:[p.x+.7,p.y+.022,p.z],s:[.045,.025,.55]});}
  return {frames,panels,feet,rails,guides,lights,tanks,cores,collars};
 },[plan]);
 return <group name="mars-research-campus" dispose={null}>
  {plan.sites.map(s=><group key={s.id} name={'campus-'+s.id}><Suspense fallback={null}><CampusModel site={s}/></Suspense><FacilityLabel site={s}/>{s.id==='greenhouse' && s.premiumBiodome && <BiodomeLighting site={s}/>}</group>)}
  <Batch name="campus-chamfered-plinths-and-path" geometry={chassis} material={dark} parts={kit.panels}/>
  <Batch name="campus-engineering-frames" geometry={box} material={metal} parts={kit.frames}/>
  <Batch name="campus-terrain-piles" geometry={cylinder} material={metal} parts={kit.feet}/>
  <Batch name="campus-equipment-collars" geometry={cylinder} material={dark} parts={kit.collars}/>
  <Batch name="campus-maintenance-railings" geometry={box} material={metal} parts={kit.rails}/>
  <Batch name="campus-navigation" geometry={box} material={cyan} parts={kit.guides}/>
  <Batch name="campus-access-status" geometry={box} material={emerald} parts={kit.lights}/>
  <Batch name="campus-atmospheric-vessels" geometry={cylinder} material={pale} parts={kit.tanks}/>
  <Batch name="campus-crystal-energy" geometry={crystal} material={purple} parts={kit.cores}/>
 </group>;
}

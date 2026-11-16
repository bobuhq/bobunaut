// Extracted from final V11. Only architecture dependencies retained.
import { useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyRelayCycle, RELAY_CONVERGENCE } from './3d/campus-relay-cycle.mjs';
import { RELAY_BORESIGHT, RELAY_EMITTER } from './3d/relay-motion.mjs';
import { towers, greenhouse } from './v11-composition.mjs';
type Surface=(x:number,z:number)=>number|null;
export function Dish({spec,surface,target=RELAY_CONVERGENCE}:{spec:typeof towers[number];surface:Surface;target?:readonly number[]}){
 const gltf=useLoader(GLTFLoader,'/mars/final-v11/campus/comms-dish-7b129a.glb');
 const kit=useMemo(()=>{
 const scene=gltf.scene.clone(true),az=scene.getObjectByName('dish-azimuth')!,el=scene.getObjectByName('dish-elevation')!;
 if(!az||!el||el.parent!==az)throw Error('GLB relay pivot hierarchy changed');
 const glow=new THREE.MeshBasicMaterial({color:spec.color,toneMapped:false});
 const ringGeo=new THREE.TorusGeometry(1,.045,6,64);
 const ring=(parent:THREE.Object3D,p:number[],radius:number,rotation:number)=>{const m=new THREE.Mesh(ringGeo,glow);m.position.set(p[0],p[1],p[2]);m.scale.setScalar(radius);m.rotation.x=rotation;parent.add(m);};
 // Actual dish normal is baked into its elevation frame, not world vertical.
 const rim=new THREE.Group();rim.position.set(0,.62,.14);rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...RELAY_BORESIGHT));el.add(rim);ring(rim,[0,0,0],1.14,0);
 ring(az,[0,.17,0],.58,Math.PI/2);
 for(const y of [.12,.28,1.25])ring(scene,[0,y,0],.48,Math.PI/2);
 const beam=new THREE.Group();beam.position.set(...RELAY_EMITTER);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...RELAY_BORESIGHT));el.add(beam);
 const beamGeo=new THREE.CylinderGeometry(.045,.045,125,12,1,true);beamGeo.translate(0,62.5,0);
 const materials=[.95,.14,.035].map((opacity,i)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide,uniforms:{tint:{value:new THREE.Color(spec.color)},alpha:{value:opacity},core:{value:i===0?1:0}},vertexShader:'varying vec2 uvBeam;void main(){uvBeam=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvBeam;uniform vec3 tint;uniform float alpha;uniform float core;void main(){float feather=pow(sin(uvBeam.x*3.14159265),2.);float fade=1.-smoothstep(.60,1.,uvBeam.y);gl_FragColor=vec4(mix(tint,vec3(1.),core*.4),alpha*feather*fade);}' }));
 materials.forEach((m,i)=>{const mesh=new THREE.Mesh(beamGeo,m);mesh.scale.set([1,5,14][i],1,[1,5,14][i]);mesh.renderOrder=4;beam.add(mesh);});
 const origin=new THREE.Vector3(),direction=new THREE.Vector3(),scale=new THREE.Vector3();
 const targetPoint=new THREE.Vector3(target[0],target[1],target[2]);
 return {scene,az,el,beam,beamGeo,ringGeo,glow,materials,origin,direction,scale,target:targetPoint};
 },[gltf,spec,target]);
 useEffect(()=>()=>{kit.beamGeo.dispose();kit.ringGeo.dispose();kit.glow.dispose();kit.materials.forEach(m=>m.dispose());},[kit]);
 useFrame(({clock})=>{const s=applyRelayCycle(kit.az,kit.el,clock.elapsedTime,spec,target);
 kit.beam.getWorldPosition(kit.origin);
 // End the synchronized optical volumes at the shared point, including GLB scale.
 kit.el.getWorldScale(kit.scale);
 kit.beam.scale.y=THREE.MathUtils.lerp(1,kit.origin.distanceTo(kit.target)/(125*kit.scale.y),s.weight);
 kit.direction.set(...RELAY_BORESIGHT).transformDirection(kit.el.matrixWorld);
 kit.scene.userData.scan={id:spec.id,time:clock.elapsedTime,yaw:kit.az.rotation.y,pitch:kit.el.rotation.x,phase:s.phase,target,origin:kit.origin.toArray(),direction:kit.direction.toArray()};
 });
 const ground=surface(spec.x,spec.z)??0,y=ground+4.4;
 return <group name={'v11-relay-'+spec.id}>
 <mesh position={[spec.x,ground+2.2,spec.z]}><cylinderGeometry args={[1.12,1.55,4.4,8]}/><meshStandardMaterial color="#4a4543" metalness={.6} roughness={.5}/></mesh>
 {[.2,3.8,4.35].map(h=><mesh key={h} position={[spec.x,ground+h,spec.z]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[h<1?1.55:1.18,.085,8,48]}/><meshBasicMaterial color={spec.color} toneMapped={false}/></mesh>)}
 <group position={[spec.x,y,spec.z]} scale={2.15}><primitive object={kit.scene}/></group></group>;
}
function Arc({points,radius=.035}:{points:THREE.Vector3[];radius?:number}){
 const kit=useMemo(()=>({geo:new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,radius,6,false),mat:new THREE.MeshStandardMaterial({color:'#8ba9b8',metalness:.7,roughness:.3,emissive:'#19caff',emissiveIntensity:.2})}),[points,radius]);
 useFrame(({clock})=>{kit.mat.emissiveIntensity=.18+.04*Math.sin(clock.elapsedTime*.65);});
 useEffect(()=>()=>{kit.geo.dispose();kit.mat.dispose();},[kit]);return <mesh geometry={kit.geo} material={kit.mat}/>;
}
export function GreenhouseGarden({deck,position=greenhouse}:{deck:number;position?:{x:number;z:number}}){
 const kit=useMemo(()=>{
 const ribs=Array.from({length:7},(_,i)=>Array.from({length:33},(_,j)=>{const t=j*Math.PI/32;return new THREE.Vector3(-8.6+i*2.87,1+5.3*Math.sin(t),4.4*Math.cos(t));}));
 return {ribs};},[]);
 return <group name="blue-transparent-greenhouse-garden" position={[position.x,deck,position.z]}>
 {kit.ribs.map((p,i)=><Arc key={i} points={p} radius={.085}/>)}
 {[-3,0,3].map(z=><group key={z} position={[0,0,z]}><mesh position={[0,.65,0]}><boxGeometry args={[15,.24,1.25]}/><meshStandardMaterial color="#4c6970"/></mesh><mesh position={[0,.81,.64]}><boxGeometry args={[15,.055,.055]}/><meshBasicMaterial color="#1acfff" toneMapped={false}/></mesh>
 {Array.from({length:12},(_,i)=><group key={i} position={[-6.9+i*1.25,.95,0]}><mesh><cylinderGeometry args={[.28,.22,.35,8]}/><meshStandardMaterial color="#726350"/></mesh>{[-1,1].map(side=><mesh key={side} position={[side*.22,.55,0]} rotation={[0,0,side*-.6]} scale={[.27,.65,.25]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color={i%2?'#70c83b':'#a2de46'}/></mesh>)}</group>)}
 </group>)}
 </group>;
}

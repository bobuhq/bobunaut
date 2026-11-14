import {useMemo,useEffect} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RELAY_BORESIGHT,RELAY_EMITTER} from './3d/relay-motion.mjs';
import {towers,scan,plaza,greenhouse,entryHeight} from './v11-composition.mjs';

type Surface=(x:number,z:number)=>number|null;
import {createV11CampusPlan} from './v11-campus-plan.mjs';
export {createV11CampusPlan} from './v11-campus-plan.mjs';

export function Dish({spec,surface}:{spec:typeof towers[number];surface:Surface}){
 const gltf=useLoader(GLTFLoader,'/mars/ares-genesis/campus/comms-dish-7b129a.glb');
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
 const origin=new THREE.Vector3(),direction=new THREE.Vector3();
 return {scene,az,el,beam,beamGeo,ringGeo,glow,materials,origin,direction};
 },[gltf,spec]);
 useEffect(()=>()=>{kit.beamGeo.dispose();kit.ringGeo.dispose();kit.glow.dispose();kit.materials.forEach(m=>m.dispose());},[kit]);
 useFrame(({clock})=>{const s=scan(clock.elapsedTime,spec);kit.az.rotation.y=s.yaw;kit.el.rotation.x=s.pitch;kit.el.updateWorldMatrix(true,true);
 kit.beam.getWorldPosition(kit.origin);kit.direction.set(...RELAY_BORESIGHT).transformDirection(kit.el.matrixWorld);
 kit.scene.userData.scan={id:spec.id,time:clock.elapsedTime,yaw:s.yaw,pitch:s.pitch,origin:kit.origin.toArray(),direction:kit.direction.toArray()};
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
function Courtyard({surface,floor}:{surface:Surface;floor:number}){
 const kit=useMemo(()=>{
 const sample=(x:number,z:number)=>surface(x,z)??0;
 const height=(x:number,z:number)=>entryHeight(sample,x,z,floor)??sample(x,z);
 const positions:number[]=[],indices:number[]=[];
 // Each tile follows the exact analytic sampler, including the supported approach.
 const tile=(x:number,z:number,w:number,d:number)=>{const n=positions.length/3;for(const [dx,dz] of [[0,0],[w,0],[0,d],[w,d]])positions.push(x+dx,height(x+dx,z+dz)-.012,z+dz);indices.push(n,n+2,n+1,n+1,n+2,n+3);};
 for(let x=plaza.xMin;x<plaza.xMax;x++)for(let z=14;z<65;z++)tile(x,z,1,1);
 for(let x=-31.2;x<-24.8;x+=.2)for(let z=5;z<14;z+=.5)tile(x,z,.2,.5);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const paving=new THREE.MeshStandardMaterial({color:'#71665e',metalness:.25,roughness:.55});
 const box=new THREE.BoxGeometry(1,1,1),warm=new THREE.MeshBasicMaterial({color:'#ffe0a0',toneMapped:false}),cyan=new THREE.MeshBasicMaterial({color:'#31e8ff',toneMapped:false}),dark=new THREE.MeshStandardMaterial({color:'#544b42'});
 const posts=new THREE.InstancedMesh(box,dark,40),lamps=new THREE.InstancedMesh(box,warm,40),edges=new THREE.InstancedMesh(box,cyan,240);const o=new THREE.Object3D();let n=0,e=0;
 for(const center of [-28,0])for(const side of [-1,1])for(let z=20;z<=60;z+=5){const x=center+side*3.6,y=height(x,z);o.position.set(x,y+.35,z);o.scale.set(.22,.7,.22);o.updateMatrix();posts.setMatrixAt(n,o.matrix);o.position.y=y+.82;o.scale.set(.16,.3,.16);o.updateMatrix();lamps.setMatrixAt(n++,o.matrix);}
 for(const center of [-28,0])for(const side of [-1,1])for(let z=14;z<64;z++){const x=center+side*2.7;o.position.set(x,height(x,z)+.025,z+.5);o.scale.set(.045,.035,.95);o.updateMatrix();edges.setMatrixAt(e++,o.matrix);}
 posts.count=n;lamps.count=n;edges.count=e;return {geo,paving,box,warm,cyan,dark,posts,lamps,edges,height};
 },[surface,floor]);
 useEffect(()=>()=>{kit.geo.dispose();kit.paving.dispose();kit.box.dispose();kit.warm.dispose();kit.cyan.dispose();kit.dark.dispose();kit.posts.dispose();kit.lamps.dispose();kit.edges.dispose();},[kit]);
 return <group name="graded-entry-garden"><mesh geometry={kit.geo} material={kit.paving} receiveShadow/><primitive object={kit.posts}/><primitive object={kit.lamps}/><primitive object={kit.edges}/>
 {[-54,24].flatMap(x=>[20,35].map(z=><group key={x+':'+z} position={[x,kit.height(x,z),z]}><mesh position={[0,.25,0]}><cylinderGeometry args={[.7,.8,.5,8]}/><meshStandardMaterial color="#65594f"/></mesh><mesh position={[0,1.05,0]} scale={[.35,.65,.35]}><octahedronGeometry/><meshBasicMaterial color="#d471ff" toneMapped={false}/></mesh></group>))}
 </group>;
}
export function VisualComposition({surface,floor=1.2}:{surface:Surface;floor?:number}){
 const plan=useMemo(()=>createV11CampusPlan((x,z)=>surface(x,z)??0),[surface]);
 return <group name="genesis-v11-visuals">{towers.map(spec=><Dish key={spec.id} spec={spec} surface={surface}/>)}<Courtyard surface={surface} floor={floor}/><GreenhouseGarden deck={plan.sites.find(s=>s.id==='greenhouse')!.deck}/></group>;
}

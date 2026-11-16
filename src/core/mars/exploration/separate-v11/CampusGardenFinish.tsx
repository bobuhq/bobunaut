import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import type {Landscape} from './campus-landscape.mjs';
import type {Rect} from './campus-traversal.mjs';
import {createGardenFinish} from './garden-finish.mjs';
import {surfaceGeometry} from './WalkableCampusShell';

type Zone={x:number;z:number;width:number;depth:number;seed:number;raisedY?:number};
function FinishSurface({rects,plan,height,color,glow=false}:{rects:Rect[];plan:Landscape;height:number;color:string;glow?:boolean}){
 const geometry=useMemo(()=>surfaceGeometry(rects,(x,z)=>plan.terrainAt(x,z)+height),[rects,plan,height]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} receiveShadow={!glow} userData={{cameraIgnore:true}}>
  {glow?<meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide}/>:<meshStandardMaterial color={color} metalness={.45} roughness={.6} side={THREE.DoubleSide}/>}
 </mesh>;
}
function GardenVegetation({zones,terrainAt}:{zones:Zone[];terrainAt:(x:number,z:number)=>number}){
 const kit=useMemo(()=>{
  const geometry=new THREE.ConeGeometry(1,1,4,1);geometry.translate(0,.5,0);
  const colors=['#809d68','#a5b975','#77a794','#9e89ae'];
  const data=colors.map(()=>[] as THREE.Matrix4[]),object=new THREE.Object3D();
  for(const zone of zones){
   const nx=Math.max(1,Math.floor(zone.width/.32)),nz=Math.max(1,Math.floor(zone.depth/.32));
   for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
    const px=zone.x-zone.width/2+(ix+.5)*zone.width/nx,pz=zone.z-zone.depth/2+(iz+.5)*zone.depth/nz;
    const n=ix*7+iz*13+zone.seed*17;
    for(let blade=0;blade<5;blade++){
     const angle=blade*Math.PI*.4+n*.23,radius=blade===0?0:.025;
     const x=px+Math.cos(angle)*radius,z=pz+Math.sin(angle)*radius;
     const height=(zone.raisedY === undefined ? .22 : .36)+((n+blade)%4)*.045;
     object.position.set(x,zone.raisedY??terrainAt(x,z)+.059,z);
     object.rotation.set(Math.sin(angle)*.10,angle,Math.cos(angle)*.10);
     object.scale.set(.028+(blade%2)*.009,height,.028+(blade%2)*.009);object.updateMatrix();
     const palette=(n+blade)%17===0?3:(n+blade)%3;data[palette].push(object.matrix.clone());
    }
   }
  }
  const meshes=data.map((matrices,i)=>{
   const material=new THREE.MeshStandardMaterial({color:colors[i],roughness:.72,metalness:.08});
   const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.name='contained-mars-ornamental-'+i;mesh.castShadow=true;
   matrices.forEach((m,j)=>mesh.setMatrixAt(j,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.userData.cameraIgnore=true;return mesh;
  });return {geometry,meshes};
 },[zones,terrainAt]);
 useEffect(()=>()=>{for(const mesh of kit.meshes){mesh.dispose();(mesh.material as THREE.Material).dispose();}kit.geometry.dispose();},[kit]);
 return <group name="controlled-mars-planting-batches">{kit.meshes.map(mesh=><primitive key={mesh.name} object={mesh}/>)}</group>;
}
function ContourRing({x,z,rx,rz,inner,color,terrainAt}:{x:number;z:number;rx:number;rz:number;inner:number;color:string;terrainAt:(x:number,z:number)=>number}){
 const geometry=useMemo(()=>{
  const g=new THREE.RingGeometry(inner,1,64,2);g.rotateX(-Math.PI/2);
  const p=g.getAttribute('position');for(let i=0;i<p.count;i++){const px=x+p.getX(i)*rx,pz=z+p.getZ(i)*rz;p.setXYZ(i,px,terrainAt(px,pz)+.08,pz);}g.computeVertexNormals();return g;
 },[x,z,rx,rz,inner,terrainAt]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} userData={{cameraIgnore:true}}><meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide}/></mesh>;
}
export function CampusGardenFinish({plan}:{plan:Landscape}){
 const finish=useMemo(()=>createGardenFinish(plan),[plan]);
 const beds=useMemo(()=>finish.beds.map(b=>({xMin:b.x-b.width/2,xMax:b.x+b.width/2,zMin:b.z-b.depth/2,zMax:b.z+b.depth/2})),[finish]);
 const soil=useMemo(()=>beds.map(b=>({xMin:b.xMin+.035,xMax:b.xMax-.035,zMin:b.zMin+.035,zMax:b.zMax-.035})),[beds]);
 const zones=useMemo(()=>[
  ...finish.beds.map(b=>({...b,width:b.width-.12,depth:b.depth-.12})),
  ...plan.planters.map((p,i)=>({...p,width:p.width-.4,depth:p.depth-.35,seed:i+80,raisedY:plan.terrainAt(p.x,p.z)+.555})),
 ],[finish,plan]);
 const forecourt=useMemo(()=>[finish.forecourt],[finish]);
 return <group name="v12-premium-exterior-garden-finish">
  {/* Keep the current dark promenade. These are thin ground-level finish layers. */}
  <group name="promenade-regolith-transition"><FinishSurface rects={finish.gravelBands} plan={plan} height={.045} color="#906a53"/></group>
  <group name="promenade-continuous-alloy-edge"><FinishSurface rects={finish.edgeBands} plan={plan} height={.068} color="#80949f"/></group>
  <group name="promenade-recessed-cyan-guidance"><FinishSurface rects={finish.edgeLights} plan={plan} height={.073} color="#5bb8c9" glow/></group>
  <group name="promenade-modular-stone-joints"><FinishSurface rects={finish.joints} plan={plan} height={.065} color="#40565e"/></group>
  <group name="hub-stair-arrival-forecourt"><FinishSurface rects={forecourt} plan={plan} height={.068} color="#354852"/>
   <ContourRing x={-44} z={-55.15} rx={1.28} rz={1.28} inner={.973} color="#96aab2" terrainAt={plan.terrainAt}/>
   <ContourRing x={-44} z={-55.15} rx={.6} rz={.6} inner={.94} color="#63b8c9" terrainAt={plan.terrainAt}/>
   {[[-44,-56.55],[-44,-53.85]].map(([x,z])=><mesh key={z} position={[x,plan.terrainAt(x,z)+.077,z]} rotation={[-Math.PI/2,0,Math.PI/4]} userData={{cameraIgnore:true}}><planeGeometry args={[.13,.13]}/><meshBasicMaterial color="#a4b7bc" toneMapped={false}/></mesh>)}
  </group>
  <group name="paired-recessed-garden-islands"><FinishSurface rects={beds} plan={plan} height={.064} color="#44535a"/>
   <FinishSurface rects={soil} plan={plan} height={.055} color="#503d30"/>
  </group>
  <GardenVegetation zones={zones} terrainAt={plan.terrainAt}/>
  {finish.studs.map((p,i)=><group key={i} name="paired-low-arrival-guide" position={[p.x,plan.terrainAt(p.x,p.z)+.035,p.z]}>
   <mesh position={[0,.018,0]} userData={{cameraIgnore:true}}><cylinderGeometry args={[.105,.12,.036,12]}/><meshStandardMaterial color="#6d8390" metalness={.65} roughness={.4}/></mesh>
   <mesh position={[0,.038,0]} rotation={[-Math.PI/2,0,0]} userData={{cameraIgnore:true}}><ringGeometry args={[.055,.085,16]}/><meshBasicMaterial color={p.purple?'#a38bc5':'#69c5d4'} toneMapped={false}/></mesh>
  </group>)}
  {plan.planters.filter((_,i)=>i%2===0).map((p,i)=><group key={i} name="contained-ornamental-bio-pod" position={[p.x,plan.terrainAt(p.x,p.z)+.555,p.z]}>
   <mesh position={[0,.14,0]} userData={{cameraIgnore:true}}><cylinderGeometry args={[.11,.13,.28,12]}/><meshPhysicalMaterial color="#75bcbd" transparent opacity={.18} depthWrite={false} metalness={.15} roughness={.23}/></mesh>
   <mesh position={[0,.29,0]} rotation={[-Math.PI/2,0,0]} userData={{cameraIgnore:true}}><ringGeometry args={[.08,.12,16]}/><meshBasicMaterial color="#a28bc4" toneMapped={false}/></mesh>
  </group>)}
  {/* Low energy, local bounce only; no bright coloured wash across the strip. */}
  {[[-44,-55.2],[-51,-49],[10.3,-63]].map(([x,z],i)=><pointLight key={i} name="restrained-landscape-bounce" position={[x,plan.terrainAt(x,z)+.65,z]} color={i===1?'#a293c6':'#79bdce'} intensity={.32} distance={5.5} decay={2}/>)}
 </group>;
}

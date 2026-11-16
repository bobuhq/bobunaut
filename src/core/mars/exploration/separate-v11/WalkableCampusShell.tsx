import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CONNECTOR_HEIGHT as HEIGHT } from './connected-campus-layout.mjs';
import { foundationProfile, type Traversal, type Rect } from './campus-traversal.mjs';
import type { PlannedBuilding } from './connected-campus-layout.mjs';
export function surfaceGeometry(cells:Rect[],sample:(x:number,z:number)=>number){
 const vertices:number[]=[];
 for(const r of cells){const nx=Math.ceil((r.xMax-r.xMin)/.5),nz=Math.ceil((r.zMax-r.zMin)/.5);
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const x0=r.xMin+(r.xMax-r.xMin)*i/nx,x1=r.xMin+(r.xMax-r.xMin)*(i+1)/nx;
   const z0=r.zMin+(r.zMax-r.zMin)*j/nz,z1=r.zMin+(r.zMax-r.zMin)*(j+1)/nz;
   for(const [x,z] of [[x0,z0],[x0,z1],[x1,z0],[x1,z0],[x0,z1],[x1,z1]])vertices.push(x,sample(x,z),z);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
export function WalkableCampusShell({model}:{model:Traversal}){
 const kit=useMemo(()=>{
  const floor=surfaceGeometry(model.cells,(x,z)=>model.floor(x,z)!);
  const roof=surfaceGeometry(model.cells,(x,z)=>model.floor(x,z)!+HEIGHT);
  return {floor,roof};
 },[model]);
 useEffect(()=>()=>{kit.floor.dispose();kit.roof.dispose();},[kit]);
 return <group name="v12-complete-walkable-rear-U">
  <mesh name="rear-U-continuous-walkable-floor" geometry={kit.floor} receiveShadow><meshStandardMaterial color="#657482" emissive="#123b50" emissiveIntensity={.12} metalness={.5} roughness={.48} side={THREE.DoubleSide}/></mesh>
  <mesh name="rear-U-continuous-roof" geometry={kit.roof} castShadow receiveShadow><meshStandardMaterial color="#465564" emissive="#173443" emissiveIntensity={.18} metalness={.6} roughness={.4} side={THREE.DoubleSide}/></mesh>
  {[{x:-40,z:-76.55},{x:model.links[3].b[0],z:model.links[3].b[2]-1.4}].map((p,i)=>{
   const floor=model.floor(p.x,p.z)!;
   return <group key={'portal-'+i} name={i?'genesis-real-rear-door-frame':'hub-real-rear-door-frame'} position={[p.x,floor,p.z]}>
    {[-1,1].map(side=><group key={side}>
     <mesh position={[side*1.47,1.55,0]} castShadow><boxGeometry args={[.14,3.1,.4]}/><meshStandardMaterial color="#aab9c4" metalness={.7} roughness={.35}/></mesh>
     <mesh position={[side*1.39,1.55,.22]}><boxGeometry args={[.035,2.98,.035]}/><meshBasicMaterial color="#67dfff" toneMapped={false}/></mesh>
    </group>)}
    <mesh name="rear-portal-slim-lintel" position={[0,3.1,0]} castShadow><boxGeometry args={[3.08,.075,.18]}/><meshStandardMaterial color="#aab9c4" emissive="#204354" emissiveIntensity={.2} metalness={.7} roughness={.35}/></mesh>
   </group>;
  })}
  {model.walls.map((edge,index)=>{
   const dx=edge.b[0]-edge.a[0],dz=edge.b[1]-edge.a[1],length=Math.hypot(dx,dz),n=Math.ceil(length/1.8);
   return Array.from({length:n},(_,i)=>{
    const point=(t:number)=>[edge.a[0]+dx*t,edge.a[1]+dz*t];
    const a=point(i/n),b=point((i+1)/n),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const ya=model.floor(a[0],a[1])!,yb=model.floor(b[0],b[1])!,slope=Math.atan2(yb-ya,length/n);
    return <group key={`${index}-${i}`} position={[x,(ya+yb)/2,z]} rotation={[0,-Math.atan2(dz,dx),0]}>
     <group rotation={[0,0,slope]}>
      <mesh position={[0,.4,0]} castShadow><boxGeometry args={[length/n+.025,.8,.16]}/><meshStandardMaterial color="#303e4d" emissive="#12384b" emissiveIntensity={.12} metalness={.65} roughness={.4}/></mesh>
      <mesh position={[0,2.15,0]}><boxGeometry args={[length/n+.025,2.7,.075]}/><meshPhysicalMaterial color="#398ba5" transparent opacity={.48} depthWrite={false} roughness={.15} metalness={.15}/></mesh>
      <mesh name="rear-U-slim-roof-edge-rail" position={[0,HEIGHT,0]} castShadow><boxGeometry args={[length/n+.05,.1,.18]}/><meshStandardMaterial color="#acbac4" emissive="#173443" emissiveIntensity={.18} metalness={.7} roughness={.35}/></mesh>
      <mesh position={[-length/n/2,HEIGHT/2,0]} castShadow><boxGeometry args={[.11,HEIGHT,.2]}/><meshStandardMaterial color="#acbac4" metalness={.7} roughness={.35}/></mesh>
      {[.84,HEIGHT-.15].map((y,k)=><mesh key={y} position={[0,y,0]}><boxGeometry args={[length/n+.02,.055,.21]}/><meshBasicMaterial color={k?'#b38af8':'#63e9ff'} toneMapped={false}/></mesh>)}
     </group>
    </group>;
   });
  })}
  {[[-40,-80],[-40,-89],[-29,-93.5],[-17,-93.5],[-7,-90]].map(([x,z])=><pointLight key={x+','+z} name="rear-U-low-blue-bounce" position={[x,model.floor(x,z)!+.65,z]} color="#58bfe5" intensity={.65} distance={4.2} decay={2}/>)}
 </group>;
}
export function CampusFoundation({building,terrainAt}:{building:PlannedBuilding;terrainAt:(x:number,z:number)=>number}){
 const geometry=useMemo(()=>{
  const points=foundationProfile(building,terrainAt),v:number[]=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   for(const p of [[a.x,a.bottom,a.z],[a.x,a.top,a.z],[b.x,b.bottom,b.z],[b.x,b.bottom,b.z],[a.x,a.top,a.z],[b.x,b.top,b.z]])v.push(...p);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;
 },[building,terrainAt]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const site=building.plan.sites[0];
 return <group name="genesis-individual-terrain-sealed-foundation">
  <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#4d525a" metalness={.4} roughness={.68} side={THREE.DoubleSide}/></mesh>
  <mesh position={[building.worldX,site.deck+.2,building.worldZ]} receiveShadow><boxGeometry args={[site.width,.4,site.depth]}/><meshStandardMaterial color="#243640" metalness={.6} roughness={.48}/></mesh>
 </group>;
}

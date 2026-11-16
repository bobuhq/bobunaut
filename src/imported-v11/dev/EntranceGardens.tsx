// Extracted from final V11. Only architecture dependencies retained.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ENTRY_CENTERS, ENTRY_PLANTERS, ENTRY_BOLLARDS } from './entrance-landscape';
type Height = (x:number,z:number)=>number;
export function EntranceGardens({height,surface}:{height:Height;surface:Height}) {
  const kit=useMemo(()=>{
    const box=new THREE.BoxGeometry(1,1,1),leaf=new THREE.OctahedronGeometry(1,0);
    const materials={
      paving:new THREE.MeshStandardMaterial({color:'#526174',metalness:.42,roughness:.29}),
      dark:new THREE.MeshStandardMaterial({color:'#242c3b',metalness:.65,roughness:.34}),
      cyan:new THREE.MeshStandardMaterial({color:'#a1eeff',emissive:'#18baff',emissiveIntensity:2.2,roughness:.25}),
      purple:new THREE.MeshStandardMaterial({color:'#cf69ef',emissive:'#9a25d4',emissiveIntensity:1.4}),
      green:new THREE.MeshStandardMaterial({color:'#9cba45',roughness:.66}),
      warm:new THREE.MeshStandardMaterial({color:'#ffe4ae',emissive:'#ffbe59',emissiveIntensity:1.6}),
    };
    const o=new THREE.Object3D();
    const batch=(geometry:THREE.BufferGeometry,material:THREE.Material,items:number[][])=>{
      const m=new THREE.InstancedMesh(geometry,material,items.length);
      items.forEach(([x,y,z,sx,sy,sz,rz=0],i)=>{o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(0,0,rz);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
      m.receiveShadow=true;return m;
    };
    const positions:number[]=[],indices:number[]=[];
    // Integer-aligned subdivisions preserve the terrain grid's triangle diagonal.
    for(const cx of ENTRY_CENTERS)for(let x=cx-3;x<cx+3;x+=.5)for(let z=11;z<28;z+=.5){
      const n=positions.length/3;
      for(const [dx,dz] of [[0,0],[0,.49],[.49,.49],[.49,0]])positions.push(x+dx,height(x+dx,z+dz)+.012,z+dz);
      indices.push(n,n+1,n+3,n+1,n+2,n+3);
    }
    const paving=new THREE.BufferGeometry();paving.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));paving.setIndex(indices);paving.computeVertexNormals();
    const edges:number[][]=[],housings:number[][]=[],lenses:number[][]=[],beds:number[][]=[],rims:number[][]=[],plants:number[][]=[],accents:number[][]=[],gold:number[][]=[];
    for(const cx of ENTRY_CENTERS)for(const side of [-1,1])for(let z=9.5;z<28;z+=.25){
      // Narrow toward each original doorway; the capsule has >1.5m clearance.
      const x=cx+side*(z<11?1.75:2.2),next=z+.25,y=height(x,z),ny=height(x,next);
      edges.push([x,(y+ny)/2+.045,z+.125,.055,.035,Math.hypot(.25,ny-y)]);
      // Rotate around X below to follow a slope without floating LED segments.
    }
    for(const b of ENTRY_BOLLARDS){const y=height(b.x,b.z);housings.push([b.x,y+.42,b.z,.2,.84,.2]);lenses.push([b.x,y+.78,b.z,.23,.23,.23]);}
    for(const p of ENTRY_PLANTERS){const y=surface(p.x,p.z);beds.push([p.x,y+.24,p.z,p.width,.48,p.depth]);rims.push([p.x,y+.5,p.z+p.depth/2,p.width,.065,.065]);
      for(let i=0;i<7;i++){
        const x=p.x-1.2+(i%4)*.78,z=p.z-.7+Math.floor(i/4)*1.1;
        for(const side of [-1,1])plants.push([x+side*.14,y+.92,z,.25,.66+(i%3)*.1,.27,side*.45]);
        if(i%3===0)accents.push([x+.25,y+.76,z+.2,.12,.4,.14,.2]);
      }
      gold.push([p.x,y+.9,p.z+1,.16,.38,.16]);
    }
    const batches=[batch(box,materials.cyan,edges),batch(box,materials.dark,housings),batch(box,materials.cyan,lenses),batch(box,materials.dark,beds),batch(box,materials.purple,rims),batch(leaf,materials.green,plants),batch(leaf,materials.purple,accents),batch(box,materials.warm,gold)];
    // Local tangent of each short strip follows the exact sampled surface.
    edges.forEach(([x,y,z,sx,sy,sz],i)=>{o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(-Math.atan2(height(x,z+.125)-height(x,z-.125),.25),0,0);o.updateMatrix();batches[0].setMatrixAt(i,o.matrix);});
    return {box,leaf,materials,paving,batches};
  },[height,surface]);
  useEffect(()=>()=>{kit.box.dispose();kit.leaf.dispose();kit.paving.dispose();Object.values(kit.materials).forEach(m=>m.dispose());kit.batches.forEach(b=>b.dispose());},[kit]);
  return <group name="dev-reference-twin-entrance-gardens">
    <mesh geometry={kit.paving} material={kit.materials.paving} receiveShadow/>
    {kit.batches.map((b,i)=><primitive key={i} object={b}/>)}
    {ENTRY_CENTERS.flatMap(cx=>[12,19,26].map(z=><pointLight key={`${cx}:${z}`} position={[cx,height(cx,z)+.7,z]} color="#219aff" intensity={11} distance={6.5} decay={2}/>))}
    {ENTRY_PLANTERS.map(p=><group key={`${p.x}:${p.z}`}>
      <pointLight position={[p.x,surface(p.x,p.z)+1.05,p.z]} color={p.z===13?"#b849ef":"#edbb66"} intensity={5} distance={4.5} decay={2}/>
    </group>)}
  </group>;
}

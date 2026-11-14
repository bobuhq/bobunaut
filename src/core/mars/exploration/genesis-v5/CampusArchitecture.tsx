import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import type {CampusPlan} from './3d/campus-layout.mjs';
import {campusArchitecture} from './campus-architecture.mjs';

/** Shared geometry/material batches; no extra lights, physics or controller. */
export function CampusArchitecture({plan}:{plan:CampusPlan}){
 const kit=useMemo(()=>{
  const geometry=new THREE.BoxGeometry(1,1,1);
  const materials={
   alloy:new THREE.MeshStandardMaterial({color:'#b2bdc4',metalness:.68,roughness:.34}),
   dark:new THREE.MeshStandardMaterial({color:'#243640',metalness:.6,roughness:.48}),
   glass:new THREE.MeshPhysicalMaterial({color:'#308bad',metalness:.3,roughness:.16,transparent:true,opacity:.65,depthWrite:false}),
   cyan:new THREE.MeshBasicMaterial({color:'#51deed',toneMapped:false}),
   purple:new THREE.MeshBasicMaterial({color:'#bc80ef',toneMapped:false}),
  };
  const batches=Object.entries(materials).map(([key,material])=>{
   const parts=plan.sites.flatMap(s=>campusArchitecture(s.id).filter(p=>p.material===key).map(p=>({p,s})));
   const mesh=new THREE.InstancedMesh(geometry,material,parts.length),o=new THREE.Object3D();
   mesh.name='campus-architecture-'+key;mesh.castShadow=key==='alloy'||key==='dark';mesh.receiveShadow=true;
   parts.forEach(({p,s},i)=>{o.position.set(s.x+p.position[0],s.deck+p.position[1],s.z+p.position[2]);o.scale.set(...p.size);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});
   mesh.computeBoundingSphere();return mesh;
  });
  return {geometry,materials,batches};
 },[plan]);
 useEffect(()=>()=>{kit.batches.forEach(m=>m.dispose());kit.geometry.dispose();Object.values(kit.materials).forEach(m=>m.dispose());},[kit]);
 return <group name="integrated-campus-architecture">{kit.batches.map(m=><primitive key={m.name} object={m}/>)}</group>;
}

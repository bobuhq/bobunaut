import {CampusGardenFinish} from './CampusGardenFinish';
import {unionPlan} from './campus-traversal.mjs';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Landscape } from './campus-landscape.mjs';
import { surfaceGeometry } from './WalkableCampusShell';
export function CampusLandscape({plan}:{plan:Landscape}){
 const geometry=useMemo(()=>surfaceGeometry(plan.cells,(x,z)=>plan.terrainAt(x,z)+.035),[plan]);
 const paving=useMemo(()=>{
  // Only render paving inside the approved, terrain-safe campus cells.
  // Never restore filtered surfaces through Water or player structures.
  const approvedPaths=plan.cells.filter(cell=>{
   const x=(cell.xMin+cell.xMax)/2;
   const z=(cell.zMin+cell.zMax)/2;
   return plan.paths.some(path=>
    x>=path.xMin && x<=path.xMax &&
    z>=path.zMin && z<=path.zMax
   );
  });
  return surfaceGeometry(approvedPaths,(x,z)=>plan.terrainAt(x,z)+.055);
 },[plan]);
 useEffect(()=>()=>{geometry.dispose();paving.dispose();},[geometry,paving]);
 return <group name="v12-connected-ground-level-campus-landscape">
  <mesh geometry={geometry} receiveShadow name="terrain-following-regolith-courts-and-paths"><meshStandardMaterial color="#80584a" roughness={.88} metalness={.12} side={THREE.DoubleSide}/></mesh>
  <mesh visible={true} geometry={paving} receiveShadow name="connected-all-weather-pedestrian-promenade"><meshStandardMaterial color="#aab9c6" metalness={.22} roughness={.78} side={THREE.DoubleSide}/></mesh>

  {/* v12-cyan-promenade-edge-light: visual only; no colliders */}
  {unionPlan(plan.cells.filter(cell => {
    const x = (cell.xMin + cell.xMax) / 2;
    const z = (cell.zMin + cell.zMax) / 2;
    return plan.paths.some(path =>
      x >= path.xMin && x <= path.xMax &&
      z >= path.zMin && z <= path.zMax
    );
  })).edges.map((edge,i) => {
    const dx = edge.b[0] - edge.a[0];
    const dz = edge.b[1] - edge.a[1];
    const length = Math.hypot(dx,dz);
    const count = Math.max(1,Math.ceil(length / .65));
    return Array.from({length:count},(_,j)=>{
      const t = (j+.5)/count;
      const x = edge.a[0]+dx*t;
      const z = edge.a[1]+dz*t;
      const y = plan.terrainAt(x,z)+.095;
      return <mesh
        key={`cyan-${i}-${j}`}
        name="cyan-promenade-guidance"
        position={[x,y,z]}
        rotation={[0,-Math.atan2(dz,dx),0]}
        renderOrder={4}
      >
        <boxGeometry args={[length/count+.025,.018,.055]}/>
        <meshBasicMaterial
          color="#40eaff"
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>;
    });
  })}

  {plan.borders.map((e,i)=>{
   const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],n=Math.ceil(Math.hypot(dx,dz));
   return Array.from({length:n},(_,j)=>{const t=(j+.5)/n,x=e.a[0]+dx*t,z=e.a[1]+dz*t,y=plan.terrainAt(x,z);
    return <group key={`${i}-${j}`} position={[x,y,z]} rotation={[0,-Math.atan2(dz,dx),0]}>
     <mesh position={[0,.11,0]} castShadow><boxGeometry args={[Math.hypot(dx,dz)/n+.02,.22,.18]}/><meshStandardMaterial color="#414755" metalness={.55} roughness={.5}/></mesh>
     <mesh position={[0,.23,0]}><boxGeometry args={[Math.hypot(dx,dz)/n,.025,.16]}/><meshBasicMaterial color={i%2?'#9e6de3':'#58d8ef'} toneMapped={false}/></mesh>
    </group>;
   });
  })}
  {plan.planters.map((p,i)=>{
   const y=plan.terrainAt(p.x,p.z)+.035;
   return <group key={p.id} name={p.id} position={[p.x,y,p.z]}>
    <mesh position={[0,.25,0]} castShadow><boxGeometry args={[p.width,.5,p.depth]}/><meshStandardMaterial color="#34404d" metalness={.6} roughness={.45}/></mesh>
    <mesh position={[0,.51,0]}><boxGeometry args={[p.width-.2,.025,p.depth-.2]}/><meshStandardMaterial color="#35251e" roughness={1}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[0,.44,side*(p.depth/2+.01)]}><boxGeometry args={[p.width,.04,.035]}/><meshBasicMaterial color={i%2?'#6ae3ff':'#bd74ed'} toneMapped={false}/></mesh>)}
    {/* Controlled planting is batched in CampusGardenFinish; body/collision footprint stays unchanged. */}
   </group>;
  })}
  {plan.benches.map((p,i)=><group key={i} name="campus-gathering-bench" position={[p.x,plan.terrainAt(p.x,p.z)+.035,p.z]}>
   <mesh position={[0,.5,0]} castShadow><boxGeometry args={[2.4,.14,.7]}/><meshStandardMaterial color="#8e9da8" metalness={.55} roughness={.4}/></mesh>
   <mesh position={[0,.83,-.28]} castShadow><boxGeometry args={[2.4,.55,.12]}/><meshStandardMaterial color="#4b5868" metalness={.5} roughness={.45}/></mesh>
   {[-.9,.9].map(x=><mesh key={x} position={[x,.25,0]}><boxGeometry args={[.16,.5,.55]}/><meshStandardMaterial color="#303944"/></mesh>)}
  </group>)}

  <CampusGardenFinish plan={plan}/>

  {plan.lamps.map(([x,z],i)=><group key={i} name="campus-promenade-bollard" position={[x,plan.terrainAt(x,z)+.035,z]}>
   <mesh position={[0,.4,0]} castShadow><boxGeometry args={[.16,.8,.16]}/><meshStandardMaterial color="#293442" metalness={.6} roughness={.4}/></mesh>
   <mesh position={[0,.84,0]}><boxGeometry args={[.18,.18,.18]}/><meshBasicMaterial color={i%3?'#67dcff':'#b47bf4'} toneMapped={false}/></mesh>
  </group>)}
 </group>;
}

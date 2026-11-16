// Extracted from final V11. Only architecture dependencies retained.
import { useMemo, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { meshWallObstacles, type WallObstacle } from '../../../../../core/mars/exploration/separate-v11/mesh-wall-obstacles';
import { openResearchShell } from '../../../../../core/mars/exploration/separate-v11/portal-geometry';
import type { CampusPlan, CampusSite } from './3d/campus-layout.mjs';
function Asset({site,traversable=false,onHullObstacles}:{site:CampusSite;traversable?:boolean;onHullObstacles?:(o:WallObstacle[])=>void}){
 const gltf=useLoader(GLTFLoader,'/mars/final-v11/campus/'+site.file);
 const kit=useMemo(()=>{
 const scene=gltf.scene.clone(true),owned:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[];
 scene.updateMatrixWorld(true);
 if(traversable&&site.id==='habitat')geometries.push(...openResearchShell(scene,site.scale));
 scene.traverse(o=>{if(o instanceof THREE.Mesh){
 if(site.id==='greenhouse'){
 const glass=o.name==='shell'||o.name==='glazing'||o.name==='hatch-glass';
 const m=new THREE.MeshPhysicalMaterial({color:glass?'#71c6d9':'#aab9c1',transparent:glass,opacity:glass?.16:1,depthWrite:!glass,roughness:glass?.16:.4,metalness:glass?.15:.65,side:THREE.DoubleSide});owned.push(m);o.material=m;if(glass)o.renderOrder=2;
 }else{const m=new THREE.MeshStandardMaterial({color:'#8296a4',metalness:.55,roughness:.44});owned.push(m);o.material=m;}
 }});
 const obstacles:WallObstacle[]=[];
 if(traversable&&site.id==='habitat')scene.traverse(o=>{if(o instanceof THREE.Mesh)obstacles.push(...meshWallObstacles(o,new THREE.Matrix4().makeScale(site.scale,site.scale,site.scale).multiply(o.matrixWorld)));});
 return {scene,owned,geometries,obstacles};},[gltf,site.id,site.scale,traversable]);
 useEffect(()=>()=>{kit.owned.forEach(m=>m.dispose());kit.geometries.forEach(g=>g.dispose());},[kit]);
 useEffect(()=>{if(site.id==='habitat')onHullObstacles?.(kit.obstacles);},[kit,onHullObstacles,site.id]);
 return <group position={[site.x,site.deck,site.z]} scale={site.scale}><primitive object={kit.scene}/></group>;
}
export function CampusAssets({plan,traversable=false,onHullObstacles}:{plan:CampusPlan;traversable?:boolean;onHullObstacles?:(o:WallObstacle[])=>void}){
 return <group name="v11-preserved-campus-assets">{plan.sites.map(s=><group key={s.id}><Asset site={s} traversable={traversable} onHullObstacles={onHullObstacles}/><mesh position={[s.x,s.deck-.09,s.z]}><boxGeometry args={[s.width,.18,s.depth]}/><meshStandardMaterial color="#74675d" roughness={.65}/></mesh>{(traversable&&s.id==='habitat'?[]:s.feet).map((f,i)=><mesh key={i} position={[f.x,(f.ground+s.deck)/2-.1,f.z]}><cylinderGeometry args={[.3,.5,Math.max(.15,s.deck-f.ground),8]}/><meshStandardMaterial color="#62574e"/></mesh>)}</group>)}</group>;
}

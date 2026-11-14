import {useMemo,useEffect} from 'react';
import {useLoader} from '@react-three/fiber';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type {CampusPlan,CampusSite} from './3d/campus-layout.mjs';
function Asset({site}:{site:CampusSite}){
 const gltf=useLoader(GLTFLoader,'/mars/ares-genesis/campus/'+site.file);
 const kit=useMemo(()=>{
 const scene=gltf.scene.clone(true),owned:THREE.Material[]=[];
 // Clone every changed material: shared GLTF cache and V10 remain untouched.
 scene.traverse(o=>{if(o instanceof THREE.Mesh){
 if(site.id==='greenhouse'){
 const glass=o.name==='shell'||o.name==='glazing'||o.name==='hatch-glass';
 const m=new THREE.MeshPhysicalMaterial({color:glass?'#71c6d9':'#aab9c1',transparent:glass,opacity:glass?.16:1,depthWrite:!glass,roughness:glass?.16:.4,metalness:glass?.15:.65,side:THREE.DoubleSide});owned.push(m);o.material=m;if(glass)o.renderOrder=2;
 }else{const m=new THREE.MeshStandardMaterial({color:'#8296a4',metalness:.55,roughness:.44});owned.push(m);o.material=m;}
 }});
 return {scene,owned};},[gltf,site.id]);
 useEffect(()=>()=>kit.owned.forEach(m=>m.dispose()),[kit]);
 return <group position={[site.x,site.deck,site.z]} scale={site.scale}><primitive object={kit.scene}/></group>;
}
export function CampusAssets({plan}:{plan:CampusPlan}){
 return <group name="v11-preserved-campus-assets">{plan.sites.map(s=><group key={s.id}><Asset site={s}/><mesh position={[s.x,s.deck-.09,s.z]}><boxGeometry args={[s.width,.18,s.depth]}/><meshStandardMaterial color="#74675d" roughness={.65}/></mesh>{s.feet.map((f,i)=><mesh key={i} position={[f.x,(f.ground+s.deck)/2-.1,f.z]}><cylinderGeometry args={[.3,.5,Math.max(.15,s.deck-f.ground),8]}/><meshStandardMaterial color="#62574e"/></mesh>)}</group>)}</group>;
}

import {VisualComposition,createV11CampusPlan} from './V11VisualComposition';
/** Local surface heights; host owns placement, terrain, character and authorization. */
export function MarsResearchCampus({surface,floor=1.2}:{surface:(x:number,z:number)=>number;floor?:number}){
 const plan=useMemo(()=>createV11CampusPlan(surface),[surface]);
 return <><CampusAssets plan={plan}/><VisualComposition surface={surface} floor={floor}/></>;
}

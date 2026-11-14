import {useGLTF} from '@react-three/drei';
import {useEffect,useMemo} from 'react';
import * as T from 'three';
const base='/models/mars/spacecraft/';
/** Local evaluation assets are deliberately outside public/ and the production import graph. */
export function SpacecraftGLBV61({interior=false,reflection,onReady}:{interior?:boolean;reflection:T.Texture;onReady?:()=>void}) {
 const {scene}=useGLTF(base+(interior?'wasp-original-v61.glb':'hodbin-original-v61.glb'));
 const model=useMemo(()=>{
  scene.updateMatrixWorld(true);
  const group=new T.Group();
  scene.traverse(obj=>{
   if(!(obj instanceof T.Mesh))return;
   // Hodbin contains THREE separately spaced paint variants; use the central original only.
   if(!interior&&!obj.name.startsWith('Cube007')&&!obj.name.startsWith('Cube.007'))return;
   const mesh=obj.clone(false);mesh.matrixAutoUpdate=false;mesh.matrix.copy(obj.matrixWorld);
   mesh.castShadow=true;mesh.receiveShadow=true;
   const original=obj.material as T.MeshStandardMaterial;
   const finish=original.clone();
   mesh.material=finish;
   // ?materials=authored is the unmodified GLTFLoader baseline (including source emission).
   const authored=new URLSearchParams(window.location.search).get('materials')==='authored';
   if(!authored){
    finish.envMap=reflection;
    finish.toneMapped=true;
    if(!interior){
     finish.color.set('#8999a5');
     finish.emissiveIntensity=.08; // Source KHR_materials_emissive_strength is 5.
     finish.metalness=.78;finish.roughness=.68;
     finish.envMapIntensity=.45;
    }else if(original.name!=='glass'){
     finish.color.set(original.name==='08_-_Default'?'#718493':'#344553');
     finish.emissiveIntensity=original.name==='displ'?.45:.025;
     finish.metalness=original.name==='08_-_Default'?.7:.38;
     finish.roughness=.78;finish.envMapIntensity=.18;
    }
   }
   mesh.userData.authoredMaterial={name:original.name,color:original.color.getHexString(),emissiveIntensity:original.emissiveIntensity};
   if(!authored&&interior&&obj.name.includes('glass')){
    finish.transparent=true;finish.opacity=.055;finish.depthWrite=false;
   }
   group.add(mesh);
  });
  if(!interior){
   const box=new T.Box3().setFromObject(group),center=box.getCenter(new T.Vector3());
   // Original authored world has nose -Z, up +Y. Uniform scale retains engineering proportions.
   group.position.set(-center.x*.30,-center.y*.30,-center.z*.30);group.scale.setScalar(.30);
  }else{group.rotation.y=Math.PI;group.scale.setScalar(3);group.position.set(0,-6.45,-6.45);}
  return group;
 },[scene,interior,reflection]);
 useEffect(()=>()=>{model.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.Material).dispose();});},[model]);
 useEffect(()=>{if(model.children.length>0)onReady?.();},[model,onReady]);
 // Console-only developer diagnostics; no persistent overlay or renderer mutation.
 useEffect(()=>{
  const inspect=()=>{const materials:unknown[]=[];model.traverse(o=>{if(o instanceof T.Mesh){const m=o.material as T.MeshStandardMaterial;materials.push({mesh:o.name,source:o.userData.authoredMaterial,color:m.color.getHexString(),emissive:m.emissive.getHexString(),emissiveIntensity:m.emissiveIntensity,metalness:m.metalness,roughness:m.roughness,envMapIntensity:m.envMapIntensity,toneMapped:m.toneMapped,opacity:m.opacity,depthWrite:m.depthWrite,maps:Object.fromEntries(['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'].map(key=>{const tex=m[key as keyof T.MeshStandardMaterial] as T.Texture|null;return [key,tex?{uuid:tex.uuid,colorSpace:tex.colorSpace}:null];}))});}});return materials;};
  const diagnostics=window as unknown as {__aresV62Materials?:()=>unknown};diagnostics.__aresV62Materials=inspect;
  return ()=>{if(diagnostics.__aresV62Materials===inspect)delete diagnostics.__aresV62Materials;};
 },[model]);
 return <primitive object={model} dispose={null}/>;
}

import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {INTEGRATED_PAVING,type IntegratedCampusSite} from './integrated-campus.mjs';
function FacilitySign({text,position,width}:{text:string;position:[number,number,number];width:number}){
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
  const c=canvas.getContext('2d')!;c.fillStyle='#162b37';c.fillRect(0,0,1024,128);
  c.fillStyle='#69e8ed';c.fillRect(0,116,1024,4);c.font='600 42px sans-serif';c.textAlign='center';c.fillStyle='#e0eef4';c.fillText(text,512,77);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[text]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh name={text} position={position}><planeGeometry args={[width,width/8]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
}
export function CampusWayfinding({site}:{site:IntegratedCampusSite}){
 const kit=useMemo(()=>{
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial({color:'#57cdd9',toneMapped:false});
  const marks:{x:number;z:number;w:number;d:number}[]=[];
  for(const p of INTEGRATED_PAVING){
   const alongX=p.halfWidth>p.halfDepth,length=2*(alongX?p.halfWidth:p.halfDepth);
   for(let t=.35;t<length-.25;t+=1.5)for(const side of [-1,1])marks.push({
    x:alongX?p.x-p.halfWidth+t:p.x+side*(p.halfWidth-.18),
    z:alongX?p.z+side*(p.halfDepth-.18):p.z-p.halfDepth+t,w:alongX?.65:.045,d:alongX?.045:.65});
  }
  const mesh=new THREE.InstancedMesh(geometry,material,marks.length),o=new THREE.Object3D();
  marks.forEach((p,i)=>{o.position.set(p.x,site.surfaceAtLocal(p.x,p.z)+.026,p.z);o.scale.set(p.w,.008,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.computeBoundingSphere();
  return {geometry,material,mesh};
 },[site]);
 useEffect(()=>()=>{kit.mesh.dispose();kit.geometry.dispose();kit.material.dispose();},[kit]);
 return <group name="campus-navigation"><primitive object={kit.mesh}/>{site.plan.sites.map(s=><FacilitySign key={s.id} text={s.id==='habitat'?'02 / BOBU RESEARCH LAB':'03 / BOTANICAL SCIENCES'} width={s.id==='habitat'?5:4.2} position={[s.x,s.deck+(s.id==='habitat'?4.5:3.15),s.z+(s.id==='habitat'?6.69:5.21)]}/>)}</group>;
}

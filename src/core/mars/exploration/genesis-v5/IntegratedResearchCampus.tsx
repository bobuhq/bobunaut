import {useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {CampusArchitecture} from './CampusArchitecture';
import {CampusWayfinding} from './CampusWayfinding';
import {CampusAssets} from './V11ResearchCampus';
import {Dish,GreenhouseGarden} from './V11VisualComposition';
import {INTEGRATED_PAVING,INTEGRATED_RELAYS,type IntegratedCampusSite} from './integrated-campus.mjs';
/** Existing V11 assets, with no station shell or second Command Hub. */
export function IntegratedResearchCampus({site}:{site:IntegratedCampusSite}){
 const paving=useMemo(()=>{
  const p:number[]=[],indices:number[]=[],uv:number[]=[];
  for(const b of INTEGRATED_PAVING)for(let x=b.x-b.halfWidth;x<b.x+b.halfWidth;x+=.5)for(let z=b.z-b.halfDepth;z<b.z+b.halfDepth;z+=.5){
   const i=p.length/3,xx=Math.min(x+.5,b.x+b.halfWidth),zz=Math.min(z+.5,b.z+b.halfDepth);
   for(const [a,c] of [[x,z],[xx,z],[x,zz],[xx,zz]]){p.push(a,site.surfaceAtLocal(a,c)+.023,c);uv.push(a/2,c/2);}
   indices.push(i,i+2,i+1,i+1,i+2,i+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 },[site]);
 useEffect(()=>()=>paving.dispose(),[paving]);
 const pavingMap=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle='#65717b';c.fillRect(0,0,256,256);
  // Deterministic brushed aggregate, with recessed two-metre panel joints.
  for(let i=0;i<1800;i++){c.fillStyle=i%2?'#6a7680':'#606c76';c.fillRect((i*73)%256,(i*151)%256,1,2);}
  c.strokeStyle='#38434c';c.lineWidth=3;c.strokeRect(0,0,256,256);
  c.strokeStyle='#89949c';c.lineWidth=1;c.strokeRect(4,4,248,248);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
 },[]);
 useEffect(()=>()=>pavingMap.dispose(),[pavingMap]);
 const greenhouse=site.plan.sites.find(s=>s.id==='greenhouse')!;
 return <group name="ares-integrated-genesis-v11" position={[-44,0,-68]}>
  <CampusAssets plan={site.plan}/>
  <CampusArchitecture plan={site.plan}/>
  <CampusWayfinding site={site}/>
  {INTEGRATED_RELAYS.map(spec=><Dish key={spec.id} spec={spec} surface={site.surfaceAtLocal}/>)}
  <GreenhouseGarden deck={greenhouse.deck} position={greenhouse}/>
  <mesh geometry={paving} receiveShadow><meshStandardMaterial map={pavingMap} color="#c4cbd0" metalness={.3} roughness={.72}/></mesh>
  {site.lamps.map(l=><group key={l.id} position={[l.x+44,site.surfaceAtLocal(l.x+44,l.z+68),l.z+68]}>
   <mesh position={[0,.35,0]}><boxGeometry args={[.22,.7,.22]}/><meshStandardMaterial color="#544b42"/></mesh>
   <mesh position={[0,.82,0]}><boxGeometry args={[.16,.3,.16]}/><meshBasicMaterial color="#ffe0a0" toneMapped={false}/></mesh>
  </group>)}
 </group>;
}

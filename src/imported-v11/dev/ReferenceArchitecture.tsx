// Extracted from final V11. Only architecture dependencies retained.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ENTRY_CENTERS } from './entrance-landscape';
import { EntranceGardens } from './EntranceGardens';
function Box({ p, size, color = '#414759', glow = false }: { p: [number,number,number]; size: [number,number,number]; color?: string; glow?: boolean }) {
  return <mesh position={p}><boxGeometry args={size} />{glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} metalness={.65} roughness={.32} />}</mesh>;
}
function Sign({ text, p, width }: {text:string;p:[number,number,number];width:number}) {
  const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#181322';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#f2c8ff';ctx.textAlign='center';ctx.font='bold 86px sans-serif';ctx.shadowColor='#b600ff';ctx.shadowBlur=20;ctx.fillText(text,512,160);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={p}><planeGeometry args={[width,width/4]} /><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
}
function Dome({x,radius,height}:{x:number;radius:number;height:number}) {
  const ribs=useMemo(()=>Array.from({length:20},(_,i)=>new THREE.CatmullRomCurve3(Array.from({length:33},(_,j)=>{
    const t=j*Math.PI/64,a=i*Math.PI/10;
    return new THREE.Vector3(radius*Math.cos(t)*Math.cos(a),height*Math.sin(t),radius*Math.cos(t)*Math.sin(a));
  }))),[radius,height]);
  return <group position={[x,6.3,0]}>
    <mesh scale={[radius,height,radius]}><sphereGeometry args={[1,48,24,0,Math.PI*2,0,Math.PI/2]}/><meshPhysicalMaterial color="#40658c" transparent opacity={.2} metalness={.35} roughness={.19} side={THREE.DoubleSide} depthWrite={false}/></mesh>
    {ribs.map((curve,i)=><mesh key={i}><tubeGeometry args={[curve,32,.065,6,false]}/><meshStandardMaterial color="#b1a5aa" metalness={.8} roughness={.28}/></mesh>)}
    {[0,.35,.65].map(t=><mesh key={t} position={[0,height*t,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius*Math.sqrt(1-t*t),.055,6,64]}/><meshStandardMaterial color="#8f9dad" metalness={.8} roughness={.3}/></mesh>)}
    <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius,.06,6,80]}/><meshBasicMaterial color="#b836ef" toneMapped={false}/></mesh>
  </group>;
}
export function ReferenceArchitecture({surface,walkHeight}:{surface:(x:number,z:number)=>number;walkHeight:(x:number,z:number)=>number}) {
  return <group name="dev-approved-reference-architecture">
    <Box p={[-15.25,3.6,-.9]} size={[14.3,4.8,16.2]}/>
    <Box p={[-15.25,6.08,-.5]} size={[14.5,.12,15.2]} color="#ad26ee" glow/>
    {[-20,-16,-12].map(x=><group key={x}><Box p={[x,3.5,7.23]} size={[2.7,2,.04]} color="#123952"/><Box p={[x,4.55,7.26]} size={[2.8,.055,.06]} color="#48dfff" glow/></group>)}
    {ENTRY_CENTERS.map(cx=><group key={cx}>
      {[-8.2,8.2].map(x=><Box key={x} p={[cx+x,6.28,0]} size={[.065,.08,18]} color="#ad26ee" glow/>)}
      {[-1.9,1.9].map(x=><Box key={x} p={[cx+x,3,9.45]} size={[.075,3.5,.08]} color="#65e4ff" glow/>)}
      <Box p={[cx,4.76,9.45]} size={[3.9,.075,.08]} color="#65e4ff" glow/>
      <pointLight position={[cx,3.4,10]} color="#60d9ff" intensity={26} distance={10} decay={2}/>
      <pointLight position={[cx,7,2]} color="#ac3de8" intensity={22} distance={15} decay={2}/>
    </group>)}
    <EntranceGardens height={walkHeight} surface={surface}/>
  </group>;
}

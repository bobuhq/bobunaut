import {useEffect,useMemo} from 'react';
import * as T from 'three';
import {CANOPY,ROOF} from './spacecraft-v5-geometry.mjs';
import {HULL_SECTIONS,panelPositions,shellPositions,SPACECRAFT_CONTRACT} from './first-party-spacecraft.mjs';
export type SpacecraftRendererProps={interior?:boolean;reflection:T.Texture;onReady?:()=>void;exitActive?:boolean};
type Point=[number,number,number];
function Box({at,size,color='#89949e',glow=false}:{at:Point;size:Point;color?:string;glow?:boolean}){
 return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={glow?.25:.72} roughness={.4} emissive={glow?color:'#000000'} emissiveIntensity={glow?1.4:0}/></mesh>;
}
function Surface({positions,glass=false,reflection}:{positions:number[];glass?:boolean;reflection:T.Texture}){
 const geometry=useMemo(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;},[positions]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} castShadow={!glass} receiveShadow><meshStandardMaterial color={glass?'#6192a3':'#89949e'} metalness={glass?.2:.75} roughness={glass?.15:.43} envMap={reflection} envMapIntensity={.5} side={T.DoubleSide} transparent={glass} opacity={glass?.14:1} depthWrite={!glass}/></mesh>;
}
const lower=shellPositions(HULL_SECTIONS.lower),aft=shellPositions(HULL_SECTIONS.aft,{aft:true});
const canopy=panelPositions(CANOPY),roof=panelPositions(ROOF);
const sideWindows=[-1,1].map(s=>panelPositions([[s*2.15,.15,-6.35],[s*2.65,2.65,-3.8],[s*2.5,2.75,-.3],[s*3.65,.1,-.3]]));
/** Pure visual alternative: physics, pad articulation, xenon, exit timing and cameras stay in their existing owners. */
export function FirstPartySpacecraft({interior=false,reflection,onReady,exitActive=false}:SpacecraftRendererProps){
 useEffect(()=>{onReady?.();},[onReady]);
 return <group name={interior?'ARES-first-party-interior':'ARES-first-party-exterior'} userData={{renderer:SPACECRAFT_CONTRACT.renderer}}>
  <Surface positions={lower} reflection={reflection}/><Surface positions={aft} reflection={reflection}/>
  <Surface positions={canopy} glass reflection={reflection}/><Surface positions={roof} reflection={reflection}/>
  {sideWindows.map((p,i)=><Surface key={i} positions={p} glass reflection={reflection}/>)}
  {/* Structural canopy mullions, panel seams and radiators authored in aircraft coordinates. */}
  {[-1,1].map(s=><group key={s}>
   <mesh position={[s*2.4,1.4,-5.05]} rotation={[-.8,0,s*.18]} castShadow><boxGeometry args={[.12,3.7,.12]}/><meshStandardMaterial color="#c4cdd2" metalness={.8} roughness={.32}/></mesh>
   <Box at={[s*2.6,2.7,-2.05]} size={[.13,.14,3.5]}/>
   <Box at={[s*3.42,.15,2.8]} size={[.22,.32,3.7]} color="#c3cbd0"/>
   {Array.from({length:9},(_,i)=><Box key={i} at={[s*3.43,.36,1.3+i*.32]} size={[.24,.08,.17]} color="#26323e"/>)}
   <Box at={[s*3.45,-.15,-2.6]} size={[.13,.09,1.6]} color="#72d5f7" glow/>
   <Box at={[s*1.85,.45,4.75]} size={[1.35,1.25,1.2]} color="#303c47"/>
   <mesh position={[s*1.85,.45,5.4]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.44,.55,.22,24]}/><meshStandardMaterial color="#183846" emissive="#3587b7" emissiveIntensity={.9} metalness={.8} roughness={.3}/></mesh>
   {[-3.9,3.9].map(z=><Box key={z} at={[s*3.5,-.8,z]} size={[1.1,.55,1.05]} color="#535e68"/>)}
  </group>)}
  {/* Open starboard passage aligns with the existing animated hatch and actor path. */}
  <Box at={[2.15,-1.15,0]} size={[2.25,.2,1.72]} color="#394550"/>
  {[-.96,.96].map(z=><Box key={z} at={[3.22,.04,z]} size={[.18,2.4,.14]} color="#c1ccd1"/>)}
  {!exitActive&&<Box at={[3.22,-.025,0]} size={[.12,2.05,1.75]} color="#aebbc6"/>}
  <Box at={[3.22,1.25,0]} size={[.18,.18,2.06]} color="#c1ccd1"/>
  <Box at={[3.12,1.13,0]} size={[.08,.04,1.75]} color="#7cddff" glow/>
  {/* Cockpit hardware exists in both views; telemetry screens are supplied by CockpitV6. */}
  <Box at={[0,.48,-4.5]} size={[2.65,.65,.38]} color="#29343f"/>
  <Box at={[0,1.19,-4.49]} size={[.6,.47,.12]} color="#151e27"/>
  {[-1,1].map(s=><group key={s}>
   <Box at={[s*.98,.08,-4.38]} size={[.7,.55,.22]} color="#202d39"/>
   <Box at={[s*.57,.27,-2.65]} size={[.25,.15,1.1]} color="#34404d"/>
   <Box at={[s*.57,.5,-3.01]} size={[.1,.42,.14]} color="#c1ccd1"/>
   {Array.from({length:6},(_,i)=><Box key={i} at={[s*(.65+i*.085),.8,-4.28]} size={[.045,.035,.05]} color={i%2?'#6bdbf1':'#e7b76c'} glow/>)}
  </group>)}
  <Box at={[0,-.22,-2.05]} size={[1.05,.22,1.15]} color="#242c35"/>
  <Box at={[0,.32,-1.51]} size={[1.05,1.15,.18]} color="#242c35"/>
  <Box at={[0,2.58,-1.5]} size={[1.8,.06,.07]} color="#9ce4ff" glow/>
 </group>;
}

import {Suspense} from 'react';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {FirstPartySpacecraft} from './FirstPartySpacecraft';
import {CockpitV6} from './CockpitV6';
import type {flightTelemetry} from './flight-telemetry.mjs';
import {PILOT_EYE} from './spacecraft-v5-geometry.mjs';
import {BEACON,beaconLevel} from './spacecraft-lighting.mjs';
import {useRef,useMemo,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as T from 'three';
const metal=<meshStandardMaterial color="#b5c5ce" metalness={.85} roughness={.3}/>;
function Text({position,fontSize,color,children}:{position:[number,number,number];fontSize:number;color:string;children:React.ReactNode}){const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d')!;ctx.font='bold 54px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(String(children),512,64);return new T.CanvasTexture(c);},[children,color]);useEffect(()=>()=>texture.dispose(),[texture]);return <mesh position={position}><planeGeometry args={[fontSize*String(children).length*.65,fontSize*1.6]}/><meshBasicMaterial map={texture} transparent depthWrite={false}/></mesh>;}

export function Strut({a,b,r=.15}:{a:T.Vector3;b:T.Vector3;r?:number}){
 const ref=useRef<T.Mesh>(null),axis=useMemo(()=>new T.Vector3(0,1,0),[]),direction=useMemo(()=>new T.Vector3(),[]);
 useFrame(()=>{if(!ref.current)return;ref.current.position.copy(a).add(b).multiplyScalar(.5);direction.subVectors(b,a);ref.current.scale.y=direction.length();ref.current.quaternion.setFromUnitVectors(axis,direction.normalize());});
 return <mesh ref={ref} castShadow><cylinderGeometry args={[r,r,1,12]}/>{metal}</mesh>;
}
type Point=[number,number,number];
export function AresSpacecraft({seat,telemetry=null,onAction=()=>{},cockpit=false,onExteriorReady,exitActive=false}:{seat:React.RefObject<T.Group|null>;telemetry?:ReturnType<typeof flightTelemetry>|null;onAction?:(name:string)=>void;cockpit?:boolean;onExteriorReady?:()=>void;exitActive?:boolean}){
 const {gl,scene:renderScene}=useThree();
 useEffect(()=>{
  const inspect=()=>{const spotlights:unknown[]=[];renderScene.traverse(o=>{if(o instanceof T.SpotLight)spotlights.push({color:o.color.getHexString(),intensity:o.intensity,angle:o.angle,distance:o.distance,penumbra:o.penumbra,position:o.getWorldPosition(new T.Vector3()).toArray(),target:o.target.getWorldPosition(new T.Vector3()).toArray()});});return {exposure:gl.toneMappingExposure,toneMapping:gl.toneMapping,outputColorSpace:gl.outputColorSpace,spotlights,programs:gl.info.programs?.map(p=>({name:p.name,diagnostics:(p as unknown as {diagnostics?:unknown}).diagnostics}))};};
  const debug=window as unknown as {__aresV62Lighting?:()=>unknown};debug.__aresV62Lighting=inspect;
  return ()=>{if(debug.__aresV62Lighting===inspect)delete debug.__aresV62Lighting;};
 },[gl,renderScene]);
 const reflection=useMemo(()=>{const generator=new T.PMREMGenerator(gl),room=new RoomEnvironment();const target=generator.fromScene(room,.06);room.dispose();generator.dispose();return target;},[gl]);
 useEffect(()=>()=>reflection.dispose(),[reflection]);
 return <group name="BOBU-ARES-EXPLORER-V61">
  <group ref={seat} name="pilot-seat-eye" position={PILOT_EYE as Point}/>
  <Suspense fallback={null}>
   <FirstPartySpacecraft interior={cockpit} reflection={reflection.texture} exitActive={exitActive} onReady={cockpit?undefined:onExteriorReady}/>
   {cockpit&&<group><CockpitV6 telemetry={telemetry} onAction={onAction}/></group>}
  </Suspense>
  {!cockpit&&<>
   {[-1,1].map(side=><SideBeacon side={side} key={side}/>)}
   <group position={[0,2.03,1]} rotation={[-Math.PI/2,0,0]}><Text position={[0,0,.01]} fontSize={.28} color="#d3e8ee">BOBU / ARES 6.2</Text></group>
  </>}
 </group>;
}

function SideBeacon({side}:{side:number}) {
 const lens=useRef<T.MeshBasicMaterial>(null),light=useRef<T.PointLight>(null);
 const color=side<0?BEACON.port:BEACON.starboard;
 useFrame(({clock})=>{
  const level=beaconLevel(clock.elapsedTime);
  if(lens.current)lens.current.color.set(color).multiplyScalar(.4+level*1.6);
  if(light.current)light.current.intensity=level*BEACON.intensity;
 });
 return <group name={side<0?'port-beacon':'starboard-beacon'} position={[side*3.7,.2,2.8]}>
  <mesh><sphereGeometry args={[.32,12,8]}/><meshBasicMaterial ref={lens} color={color} toneMapped={false}/></mesh>
  <pointLight ref={light} color={color} intensity={BEACON.intensity*BEACON.idle} distance={3} decay={2}/>
 </group>;
}

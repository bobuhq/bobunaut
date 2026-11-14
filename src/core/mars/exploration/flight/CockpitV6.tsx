import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {flightTelemetry} from './flight-telemetry.mjs';
type Telemetry=ReturnType<typeof flightTelemetry>|null;
/** All display values are flight-controller readings. No invented fuel/backend feed. */
function Display({kind,telemetry,brightness}:{kind:number;telemetry:Telemetry;brightness:number}){
 const latest=useRef(telemetry);latest.current=telemetry;
 const screen=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return {canvas,texture,last:-1};},[]);
 useEffect(()=>()=>screen.texture.dispose(),[screen]);
 useFrame(({clock})=>{
  const tick=Math.floor(clock.elapsedTime*8);if(tick===screen.last)return;screen.last=tick;
  const t=latest.current,c=screen.canvas.getContext('2d')!;
  c.fillStyle='#06151e';c.fillRect(0,0,768,384);c.strokeStyle='#20404b';c.lineWidth=1;
  for(let x=24;x<768;x+=48){c.beginPath();c.moveTo(x,60);c.lineTo(x,350);c.stroke();}
  for(let y=80;y<384;y+=48){c.beginPath();c.moveTo(24,y);c.lineTo(744,y);c.stroke();}
  c.font='bold 25px monospace';c.fillStyle='#87d5de';c.fillText(['NAVIGATION / INERTIAL','ALTITUDE / VERTICAL SPEED','PROPULSION / SYSTEMS','TERRAIN / PROFILE RADAR','ENERGY / VEHICLE'][kind],24,38);
  c.font='22px monospace';
  const lines=kind===4?['ENERGY: SENSOR UNAVAILABLE','FUEL: SENSOR UNAVAILABLE',`VEHICLE ${t?.status??'—'}`]:kind===3?[`CLEARANCE ${t?.distance??'—'} M`,'LOCAL TERRAIN / LIVE SAMPLES','LATERAL RADAR: UNAVAILABLE']:kind===0?[`HDG ${t?.heading??'—'} DEG`,`GROUND ${t?.distance??'—'} M`,`HORIZONTAL ${t?.horizontal??'—'} M/S`]:kind===1?[t?.phase??'AWAITING TERRAIN',`VERTICAL ${t?.vertical??'—'} M/S`,`AUTO T-${t?.autoRemaining??'—'} S`]:[`GEAR ${t?.gear??'—'}`,`ENGINE ${t?.enginePower??'—'} %`,`FUEL / ENERGY: NO SENSOR`];
  lines.forEach((line,i)=>{c.fillStyle=i===0?'#65d8ff':i===1?'#6fedac':'#ffbf65';c.fillText(line,26,92+i*38);});
  if(kind===0||kind===3){
   const profile=t?.terrainProfile??[],heights=profile.map(p=>p.height).filter(Number.isFinite);
   const lo=heights.length?Math.min(...heights):0,hi=heights.length?Math.max(...heights):0;
   c.strokeStyle='#d4a676';c.lineWidth=3;c.beginPath();profile.forEach((p,i)=>{const x=36+i*85,y=290-(p.height-lo)/Math.max(2,hi-lo)*85;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();
   c.font='17px monospace';c.fillStyle='#87b7bd';c.fillText('TERRAIN PROFILE / 5–45 M AHEAD',26,338);
  }
  else {const value=kind===1?Math.min(1,Math.abs(Number(t?.vertical??0))/4):Number(t?.enginePower??0)/100;c.fillStyle='#19323c';c.fillRect(26,240,710,32);c.fillStyle='#64c3d4';c.fillRect(26,240,710*value,32);c.font='20px monospace';c.fillText(t?.status??'CONTROLLER OFFLINE',26,320);}
  c.font='16px monospace';c.fillStyle='#4e8c98';c.fillText(`${kind===2?'[G] GEAR':'[F] AUTO LAND'} / ${t?'LIVE':'WAIT'} / ${String(tick%10000).padStart(4,'0')}`,24,375);screen.texture.needsUpdate=true;
 });
 return <mesh position={[0,0,.052]}><planeGeometry args={[1.22,.61]}/><meshBasicMaterial map={screen.texture} color={new T.Color(brightness,brightness,brightness)} toneMapped={false}/></mesh>;
}
/** Telemetry faces the pilot (+Z); authored Wasp hardware remains unobstructed below. */
export function CockpitV6({telemetry}:{telemetry:Telemetry;onAction:(name:string)=>void}){
 return <group name="integrated-3d-cockpit-v62">
  {[-.51,0,.51].map((x,i)=><group key={i} position={[x,i===1?1.26:.98,-4.43]} scale={[.40,.48,1]}><Display kind={i} telemetry={telemetry} brightness={1}/></group>)}
  {[-1,1].map((side,i)=><group key={side} position={[side*.98,.12,-4.25]} rotation={[-.35,-side*.25,0]} scale={[.46,.52,1]}><Display kind={i+3} telemetry={telemetry} brightness={1}/></group>)}
  <pointLight position={[0,1,-3]} color="#65beff" intensity={.7} distance={3}/>
 </group>;
}

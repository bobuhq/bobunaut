import {useEffect,useMemo,useState} from 'react';
import * as THREE from 'three';
import {loadAresGenesisTerrainData,sampleAresGenesisRenderedSurfaceMeters,type AresGenesisTerrainData} from '../engine/AresGenesisTerrainData';
import {GREEN_LANDING_ZONE as defaultZone} from './green-landing-zone.mjs';

/** Terrain-draped visual only. No floor, collider, spawn or placement mutations. */
export function GreenLandingZone({zone=defaultZone}:{zone?:{x:number;z:number;radius:number}}){
 const [terrain,setTerrain]=useState<AresGenesisTerrainData|null>(null);
 useEffect(()=>{if(!import.meta.env.DEV)return;let active=true;loadAresGenesisTerrainData().then(t=>{if(active)setTerrain(t);}).catch(e=>console.error('Landing zone terrain unavailable',e));return()=>{active=false;};},[]);
 const geometry=useMemo(()=>{
  if(!terrain)return null;
  const positions:number[]=[],indices:number[]=[];
  const height=(x:number,z:number)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z)+.13;
  const strip=(points:[number,number][])=>{const start=positions.length/3;points.forEach(([x,z])=>positions.push(x,height(x,z),z));for(let i=0;i<points.length/2-1;i++){const a=start+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}};
  // Broad rim and secondary guidance ring, sampled at <0.7m intervals.
  for(const [radius,width] of [[zone.radius,1.8],[zone.radius-5,.35]]){
   const p:[number,number][]=[];
   for(let i=0;i<=Math.ceil(zone.radius*10);i++){const a=i*Math.PI*2/Math.ceil(zone.radius*10);for(const r of [radius-width,radius])p.push([zone.x+Math.cos(a)*r,zone.z+Math.sin(a)*r]);}strip(p);
  }
  // Four broken radial guidance lanes stop well inside the permitted perimeter.
  for(let d=0;d<4;d++)for(let r=8;r<42;r+=8){const p:[number,number][]=[];for(let s=r;s<=r+4;s+=.5)for(const w of [-.35,.35]){const a=d*Math.PI/2;p.push([zone.x+Math.cos(a)*s-Math.sin(a)*w,zone.z+Math.sin(a)*s+Math.cos(a)*w]);}strip(p);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
 },[terrain,zone]);
 useEffect(()=>()=>geometry?.dispose(),[geometry]);
 if(!import.meta.env.DEV||!terrain||!geometry)return null;
 return <group name="ares-v112-green-landing-zone-local-only">
  <mesh geometry={geometry}><meshBasicMaterial color="#39ff51" toneMapped={false} side={THREE.DoubleSide}/></mesh>
  {Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,x=zone.x+Math.cos(a)*(zone.radius-1),z=zone.z+Math.sin(a)*(zone.radius-1),y=sampleAresGenesisRenderedSurfaceMeters(terrain,x,z);return <group key={i} position={[x,y,z]}><mesh position={[0,.65,0]}><cylinderGeometry args={[.15,.25,1.3,8]}/><meshBasicMaterial color="#48ff72" toneMapped={false}/></mesh>{i%4===0&&<pointLight position={[0,1.3,0]} color="#39ff51" intensity={9} distance={14} decay={2}/>}</group>;})}
 </group>;
}

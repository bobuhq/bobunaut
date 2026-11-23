import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Landscape } from './campus-landscape.mjs';
import { ARES_GENESIS_SIZE_METERS, ARES_GENESIS_RENDER_SEGMENTS } from '../engine/AresGenesisTerrainData';

type Point = [number, number];
type Court = { xMin:number; xMax:number; zMin:number; zMax:number };

// Clip to the SAME triangles used by the rendered terrain. Sampling only the
// corners of a large quad would cut through the diagonal terrain crease.
export function courtGeometry(court:Court, sample:Landscape['terrainAt']) {
  const {xMin:a,xMax:b,zMin:c,zMax:d}=court;
  const bevel=.85;
  const outline:Point[]=[[a+bevel,c],[b-bevel,c],[b,c+bevel],[b,d-bevel],[b-bevel,d],[a+bevel,d],[a,d-bevel],[a,c+bevel]];
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[];
  const grid=ARES_GENESIS_SIZE_METERS/ARES_GENESIS_RENDER_SEGMENTS;
  const cross=(a:Point,b:Point,p:Point)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  const edgeTint=new THREE.Color('#424e5b'), interiorTint=new THREE.Color('#626d79');
  const clip=(triangle:Point[])=>{
    let polygon=triangle;
    outline.forEach((start,i)=>{
      const end=outline[(i+1)%outline.length],input=polygon; polygon=[];
      input.forEach((p,j)=>{
        const q=input[(j+1)%input.length],dp=cross(start,end,p),dq=cross(start,end,q);
        if(dp>=0)polygon.push(p);
        if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);polygon.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
      });
    });
    for(let i=1;i<polygon.length-1;i++){
      // Reverse winding: world X/Z plane faces upward.
      for(const [x,z] of [polygon[0],polygon[i+1],polygon[i]]){
        positions.push(x,sample(x,z)+.038,z);
        uvs.push(x/2.4,z/1.2);
        const edge=Math.min(x-a,b-x,z-c,d-z);
        const tint=edge<.22?edgeTint:interiorTint;
        colors.push(tint.r,tint.g,tint.b);
      }
    }
  };
  for(let x=Math.floor(a/grid)*grid;x<b;x+=grid)for(let z=Math.floor(c/grid)*grid;z<d;z+=grid){
    clip([[x,z],[x+grid,z],[x,z+grid]]);
    clip([[x+grid,z+grid],[x,z+grid],[x+grid,z]]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();
  return geometry;
}

/** Continuous paving: flush mortar joints, never separated stepping stones.
 * All vertices follow the rendered terrain; this adds no collision bodies. */
export function pavingTexture(size = 256) {
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4;
    const joint=x<size/128||y<3*size/256;
    const grain=((x*73+y*151+(x*y)%97)%19)-9;
    const v=joint?103:219+grain;
    data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
}
export function CampusLandscape({plan, texture, mobile}: {plan: Landscape; texture: THREE.Texture; mobile: boolean}) {
  const surfaces=useMemo(()=>{
    const researchPath=plan.paths[plan.paths.length-1];
    const researchX=(researchPath.xMin+researchPath.xMax)/2;
    // A single broad arrival court unites the botanical entrance and Hub.
    // East edge respects Water; north edge stops before the original stairs.
    return [
      {xMin:-79,xMax:-42.5,zMin:-58.4,zMax:-40},
      {xMin:researchX-7,xMax:researchX+7,zMin:-72.5,zMax:-66.5},
    ].map(court=>courtGeometry(court,plan.terrainAt));
  },[plan]);
  useEffect(()=>()=>surfaces.forEach(surface=>surface.dispose()),[surfaces]);
  return <group name="v13-terrain-fitted-architectural-forecourts">
    {surfaces.map((geometry,i)=><mesh key={i} name="continuous-mineral-stone-and-titanium-court" geometry={geometry} receiveShadow userData={{cameraIgnore:true}}>
      <meshStandardMaterial map={texture} bumpMap={mobile ? null : texture} bumpScale={.018} vertexColors roughness={.64} metalness={.24} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/>
    </mesh>)}
    {/* Shielded wing-base uplights: warm pools rather than emissive road bands. */}
    {[-75,-64,-55,-44].map(x=><group key={x} position={[x,plan.terrainAt(x,-58.1)+.045,-58.1]}>
      <mesh rotation={[-Math.PI/2,0,0]} userData={{cameraIgnore:true}}>
        <ringGeometry args={[.1,.22,32]}/><meshStandardMaterial color="#8a96a5" metalness={.8} roughness={.3}/>
      </mesh>
      <mesh rotation={[-Math.PI/2,0,0]} userData={{cameraIgnore:true}}>
        <circleGeometry args={[.095,24]}/><meshStandardMaterial color="#ffe0b0" emissive="#ffc783" emissiveIntensity={2}/>
      </mesh>
      {!mobile && <pointLight position={[0,.65,0]} color="#ffd09a" intensity={18} distance={9} decay={2}/>}
    </group>)}
  </group>;
}

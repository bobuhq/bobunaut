import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AresGenesisTerrainData } from '../engine/AresGenesisTerrainData';
import { sampleAresGenesisRenderedSurfaceMeters } from '../engine/AresGenesisTerrainData';
import { WalkableCampusShell } from './WalkableCampusShell';
import type { Traversal } from './campus-traversal.mjs';
import { CONNECTOR_WIDTH as WIDTH, CONNECTOR_HEIGHT as HEIGHT, type Connector } from './connected-campus-layout.mjs';

type Building = {id:string;worldX:number;worldZ:number;footprint:{halfX:number;halfZ:number};plan:{sites:Array<{deck:number}>}};
type Vec3 = [number,number,number];
function Sign({position,width,height,text}:{position:Vec3;width:number;height:number;text:string}) {
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,1024,128);
    ctx.fillStyle='#e2f3ff';ctx.font='600 68px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64,990);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
  },[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={position}><planeGeometry args={[width,height]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></mesh>;
}
function Panel({at,size,color='#a9b6c1',glow=false,glass=false}:{at:Vec3;size:Vec3;color?:string;glow?:boolean;glass?:boolean}) {
  return <mesh position={at} castShadow={!glow&&!glass} receiveShadow={!glow}>
    <boxGeometry args={size}/>
    {glow?<meshBasicMaterial color={color} toneMapped={false}/>:glass?
      <meshPhysicalMaterial color={color} transparent opacity={.52} metalness={.16} roughness={.15} side={2} depthWrite={false}/>:
      <meshStandardMaterial color={color} metalness={.65} roughness={.36}/>}
  </mesh>;
}
function EnclosedLink({link,terrainAt}:{link:Connector;terrainAt:(x:number,z:number)=>number}) {
  const count=Math.max(1,Math.ceil(link.length/2));
  // Each bay has full glazing and a solid knee wall. Continuous floor and roof
  // follow the exact interpolated building datums, independently of terrain.
  return <group name={link.id}>
    {Array.from({length:count},(_,i)=>{
      const t=(i+.5)/count;
      const x=link.a[0]+(link.b[0]-link.a[0])*t;
      const z=link.a[2]+(link.b[2]-link.a[2])*t;
      const y=link.a[1]+link.rise*t;
      const length=Math.hypot(link.length/count,link.rise/count)+.04;
      const ground=terrainAt(x,z);
      return <group key={i} position={[x,y,z]} rotation={[0,link.angle,0]}>
        {y-ground>.2&&<Panel at={[0,-(y-ground)/2,0]} size={[.2,y-ground,WIDTH-.3]} color="#394451"/>}
        <group rotation={[0,0,Math.atan2(link.rise,link.length)]}>
          <Panel at={[0,-.1,0]} size={[length,.2,WIDTH]} color="#657482"/>
          <Panel at={[0,HEIGHT,0]} size={[length,.24,WIDTH+.32]} color="#465564"/>
          <Panel at={[0,HEIGHT+.16,0]} size={[length,.08,WIDTH+.42]} color="#b8c3cb"/>
          {[-1,1].map(side=><group key={side}>
            <Panel at={[0,.4,side*WIDTH/2]} size={[length,.8,.16]} color="#303e4d"/>
            <Panel at={[0,2.15,side*WIDTH/2]} size={[length,2.7,.07]} color="#398ba5" glass/>
            <Panel at={[-length/2,HEIGHT/2,side*WIDTH/2]} size={[.12,HEIGHT,.2]}/>
            <Panel at={[0,.85,side*(WIDTH/2+.08)]} size={[length,.055,.035]} color="#63e9ff" glow/>
            <Panel at={[0,HEIGHT-.15,side*(WIDTH/2-.12)]} size={[length,.045,.045]} color="#b38af8" glow/>
          </group>)}
        </group>
      </group>;
    })}
  </group>;
}
function CrystalGarden({x,y,z}:{x:number;y:number;z:number}) {
  return <group name="genesis-entrance-crystal-garden" position={[x,y,z]}>
    <mesh position={[0,.18,0]}><cylinderGeometry args={[1.25,1.38,.36,8]}/><meshStandardMaterial color="#34404c" metalness={.7} roughness={.4}/></mesh>
    <mesh position={[0,.39,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.2,.045,6,32]}/><meshBasicMaterial color="#bf75ff" toneMapped={false}/></mesh>
    {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.75,.6+(i%3)*.16,Math.cos(i*2.4)*.65]} rotation={[.15,i,.15]} scale={[.25,.55+(i%3)*.2,.25]}>
      <octahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%2?'#c6e94a':'#81d9a6'} emissive={i%2?'#729928':'#237f65'} emissiveIntensity={.5} roughness={.26}/>
    </mesh>)}
  </group>;
}
function ResearchEntrance({building,terrainAt}:{building:Building;terrainAt:(x:number,z:number)=>number}) {
  const {worldX:x,worldZ:z}=building,deck=building.plan.sites[0].deck;
  const front=z+building.footprint.halfZ;
  const toe=front+3.6,ground=terrainAt(x,toe),rise=deck+.4-ground;
  return <group name="genesis-reference-front-entrance">
    {/* All geometry stays behind the protected Water envelope (north of Z=-65.8). */}
    {Array.from({length:8},(_,i)=>{
      const top=ground+rise*(i+1)/8;
      const stepZ=toe-(i+.5)*.45;
      const bottom=Math.min(...[-2.2,0,2.2].flatMap(dx=>[-.24,.24].map(dz=>terrainAt(x+dx,stepZ+dz))))-.06;
      const height=Math.max(.12,top-bottom);
      return <group key={i}>
        <Panel at={[x,top-height/2,stepZ]} size={[4.4,height,.48]} color="#667787"/>
        <Panel at={[x,top+.012,toe-(i+.5)*.45+.19]} size={[4.35,.028,.035]} color="#65e5ff" glow/>
      </group>;
    })}
    <Panel at={[x,deck+4.65,front-.4]} size={[6.8,.95,.45]} color="#202e3d"/>
    <Sign position={[x,deck+4.65,front-.16]} width={5.8} height={.65} text="GENESIS V11"/>
    <Panel at={[x,deck+4.16,front-.15]} size={[6.6,.055,.07]} color="#b880f7" glow/>
    {[-1,1].map(side=><group key={side}>
      <Panel at={[x+side*2.3,deck+1.9,front+.1]} size={[.18,3.8,.24]}/>
      <Panel at={[x+side*2.17,deck+1.9,front+.24]} size={[.065,3.5,.04]} color="#63e9ff" glow/>
      <CrystalGarden x={x+side*4.6} y={terrainAt(x+side*4.6,front+.7)+.035} z={front+.7}/>
      {[.6,2.9].map(d=>{
        const h=ground+rise*(1-d/3.6);
        return <group key={d}>
          <Panel at={[x+side*2.65,h+.45,front+d]} size={[.2,.9,.2]} color="#293747"/>
          <Panel at={[x+side*2.65,h+.91,front+d]} size={[.22,.18,.22]} color="#75eaff" glow/>
        </group>;
      })}
    </group>)}
  </group>;
}
function BotanicalForecourt({building,terrainAt}:{building:Building;terrainAt:(x:number,z:number)=>number}) {
  const deck=building.plan.sites[0].deck;
  return <group name="v12-botanical-forecourt">
    <Panel at={[building.worldX,deck+.45,building.worldZ+5.48]} size={[7,.85,.16]} color="#243344"/>
    <Sign position={[building.worldX,deck+.45,building.worldZ+5.58]} width={6.5} height={.5} text="BOBU / BOTANICAL SCIENCES"/>
    {[-1,1].map(side=><group key={side} position={[building.worldX+side*6,terrainAt(building.worldX+side*6,building.worldZ+5.75)+.035,building.worldZ+5.75]}>
      <mesh position={[0,.18,0]}><cylinderGeometry args={[1.35,1.5,.35,24]}/><meshStandardMaterial color="#293847" metalness={.6} roughness={.4}/></mesh>
      <mesh position={[0,.38,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.33,.045,6,40]}/><meshBasicMaterial color="#b880f7" toneMapped={false}/></mesh>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i*2.4)*.8,.68+(i%3)*.12,Math.sin(i*2.4)*.8]} scale={[.23,.55+(i%3)*.13,.23]} rotation={[0,i, .2]}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%3===0?'#d8f45e':'#8bc747'} emissive="#537a16" emissiveIntensity={.3} metalness={.3} roughness={.4}/></mesh>)}
    </group>)}
    {[-1,1].map(side=><group key={side} position={[building.worldX+side*8.5,terrainAt(building.worldX+side*8.5,building.worldZ+5.8)+.035,building.worldZ+5.8]}>
      <Panel at={[0,.42,0]} size={[.22,.84,.22]} color="#293847"/>
      <Panel at={[0,.87,0]} size={[.24,.2,.24]} color="#62deff" glow/>
    </group>)}
  </group>;
}

export function ConnectedCampusArchitecture({terrain,buildings,model}:{terrain:AresGenesisTerrainData;buildings:Building[];model:Traversal|null}) {
  const terrainAt=useMemo(()=>(x:number,z:number)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z),[terrain]);
  const botanical=buildings.find(b=>b.id==='greenhouse');
  const research=buildings.find(b=>b.id==='habitat');
  const front=model?.links[0];
  return <group name="v12-connected-genesis-campus">
    {front&&<EnclosedLink link={front} terrainAt={terrainAt}/>}
    {model&&<WalkableCampusShell model={model}/>}
    {/* Open portal frames bridge the full wall thickness, with no door leaves. */}
    {research&&[-5.4,6.4].map((dz,i)=><group key={i} name={i?'genesis-front-open-airlock':'genesis-rear-open-airlock'} position={[research.worldX,research.plan.sites[0].deck+.4,research.worldZ+dz]}>
      {[-1,1].map(side=><group key={side}>
        <Panel at={[side*1.5,1.6,0]} size={[.18,3.2,.55]}/>
        <Panel at={[side*1.39,1.6,.29]} size={[.04,3.05,.04]} color="#65e5ff" glow/>
      </group>)}
      {/* Rear U already owns a structural lintel at this same doorway. */}
      {i===1&&<Panel at={[0,3.2,0]} size={[3.2,.18,.55]}/>}
      <Panel at={[0,3.08,.29]} size={[2.8,.04,.04]} color="#b780ef" glow/>
    </group>)}
    {botanical&&<BotanicalForecourt building={botanical} terrainAt={terrainAt}/>}
    {research&&<ResearchEntrance building={research} terrainAt={terrainAt}/>}
  </group>;
}

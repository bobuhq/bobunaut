import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import * as THREE from 'three';
import {BobuCharacterVisual} from '../components/BobuCharacterVisual';
import {COCKPIT_END,HATCH_END,EXIT_DURATION,disembarkActorLocal} from './disembark-v1.mjs';

/** Development-only mechanical exit, attached to the existing landed hull.
 * Geometries are separate because the authored GLB has no validated hatch bone.
 * All dimensions are expressed in aircraft-local coordinates, not world terrain.
 */
export function DisembarkRig({elapsedRef,actorRef,onFoot}:{elapsedRef:React.RefObject<number>;actorRef:React.RefObject<THREE.Group|null>;onFoot:boolean}){
 const hatch=useRef<THREE.Group>(null);
 const stairs=useRef<THREE.Group>(null);
 useFrame(()=>{
  const elapsed=elapsedRef.current;
  const open=Math.max(0,Math.min(1,(elapsed-COCKPIT_END)/(HATCH_END-COCKPIT_END)));
  const smooth=open*open*(3-2*open);
  if(hatch.current){hatch.current.visible=true;hatch.current.position.y=-1.05+smooth*2.05;}
  if(stairs.current){stairs.current.visible=elapsed>=COCKPIT_END;stairs.current.scale.x=Math.max(.005,smooth);}
  if(actorRef.current){const p=disembarkActorLocal(elapsed);actorRef.current.position.set(p.x,p.y,p.z);actorRef.current.visible=!onFoot&&elapsed>=HATCH_END;actorRef.current.rotation.y=Math.PI/2;}
 });
 return <group name="BOBU-ARES-LANDING-EXIT" >
  <group ref={hatch} position={[3.22,-1.05,0]}>
   <mesh position={[0,1.025,0]} castShadow><boxGeometry args={[.12,2.05,1.75]}/><meshStandardMaterial color="#aebbc6" metalness={.9} roughness={.26}/></mesh>
   <mesh position={[.08,.305,0]}><boxGeometry args={[.035,.13,.7]}/><meshStandardMaterial color="#53d5ff" emissive="#1675ac" emissiveIntensity={.4}/></mesh>
  </group>
  <group ref={stairs} position={[3.3,0,0]}>
   {Array.from({length:8},(_,i)=>{
    const t=(i+.5)/8,x=4.15*t,y=-1.05-3.95*t;
    return <group key={i} position={[x,y,0]}>
     <mesh castShadow receiveShadow><boxGeometry args={[.70,.11,1.6]}/><meshStandardMaterial color="#7e929f" metalness={.84} roughness={.34}/></mesh>
     <mesh position={[0,.065,-.67]}><boxGeometry args={[.61,.025,.045]}/><meshStandardMaterial color="#81dfff" emissive="#1b7bab" emissiveIntensity={.7}/></mesh>
    </group>;
   })}
   {[-.85,.85].map(z=><group key={z}>
     <mesh position={[2.07,-2.1,z]} rotation={[0,0,-.76]}><boxGeometry args={[5.8,.09,.09]}/><meshStandardMaterial color="#a3b3c0" metalness={.87} roughness={.3}/></mesh>
    </group>)}
  </group>
  <group ref={actorRef} visible={false}>
   <BobuCharacterVisual />
  </group>
 </group>;
}

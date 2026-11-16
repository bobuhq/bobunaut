import { useRef } from "react";
import * as THREE from "three";
import { AresSpacecraft } from "./flight/AresSpacecraft";
import { DisembarkRig } from "./flight/DisembarkRig";
import { GearLink } from "./flight/CinematicLanding";
import { EXIT_DURATION } from "./flight/disembark-v1.mjs";
import { FEET } from "./genesis-v5/landing-gear.mjs";
/** Same authored hull, finish, cockpit rig and open exit at actual touchdown. */
export function AresParkedSpacecraft({position,yaw}:{position:[number,number,number];yaw:number}) {
  const seat=useRef<THREE.Group>(null), actor=useRef<THREE.Group>(null);
  const elapsed=useRef(EXIT_DURATION), pads=useRef<(THREE.Mesh|null)[]>([]);
  return <group name="BOBU-Ares-landed-spacecraft" position={position} rotation={[0,yaw,0]}>
    <AresSpacecraft seat={seat} exitActive/>
    <DisembarkRig elapsedRef={elapsed} actorRef={actor} onFoot/>
    {FEET.map(([x,z],i)=><group key={i}>
      <GearLink pad={()=>pads.current[i]} x={x} z={z}/>
      <mesh ref={mesh=>{pads.current[i]=mesh;}} position={[x,-5,z]} castShadow receiveShadow>
        <boxGeometry args={[2,.3,2]}/><meshStandardMaterial color="#a3adb0" metalness={.7} roughness={.48}/>
      </mesh>
    </group>)}
  </group>;
}

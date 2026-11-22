import { usesAresMobileVisuals } from "../components/AresRenderQuality";
import {useEffect,useMemo,useRef,type RefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {aresArrivalSound} from '../audio/AresArrivalSound';
import {DoorPassageSensor,type CampusDoor,type createCampusExperience} from './campus-experience';
function PassageDoor({door,targetRef}:{door:CampusDoor;targetRef?:RefObject<THREE.Group|null>}){
 const mobileVisuals=usesAresMobileVisuals();
 const left=useRef<THREE.Group>(null),right=useRef<THREE.Group>(null),opening=useRef(0),position=useMemo(()=>new THREE.Vector3(),[]);
 const primed=useRef(false);
 const sensor=useMemo(()=>new DoorPassageSensor(door),[door]);
 useEffect(()=>()=>aresArrivalSound.stopDoor(door.id),[door.id]);
 useFrame(({clock},delta)=>{
  if(targetRef?.current){
   targetRef.current.getWorldPosition(position);
   const transition=sensor.update(position.x,position.z,clock.elapsedTime);
   if(!primed.current){aresArrivalSound.primeDoor(door.id,sensor.open);primed.current=true;}
   if(transition!==null)aresArrivalSound.door(door.id,transition,[door.x,door.floor+1.3,door.z]);
  }
  opening.current=THREE.MathUtils.damp(opening.current,sensor.open?1:0,10,delta);
  if(left.current)left.current.position.x=-.67-opening.current*1.4;
  if(right.current)right.current.position.x=.67+opening.current*1.4;
 });
 return <group name={door.id+'-automatic-sliding-panels'} position={[door.x,door.floor,door.z]}>
  {[-1,1].map(side=><group key={side} ref={side<0?left:right} position={[side*.67,0,0]}>
   <mesh name="automatic-door-glass" position={[0,1.36,0]}><boxGeometry args={[1.3,2.68,.055]}/><meshPhysicalMaterial color={mobileVisuals?"#75b0c8":"#456f83"} transparent opacity={mobileVisuals?.54:.28} depthWrite={false} metalness={.2} roughness={mobileVisuals?.23:.15} emissive="#1e4759" emissiveIntensity={mobileVisuals?.28:0}/></mesh>
   <mesh position={[side*-.61,1.36,.04]} userData={{cameraIgnore:mobileVisuals}}><boxGeometry args={[mobileVisuals?.065:.035,2.64,.025]}/><meshBasicMaterial color="#68dcf5" toneMapped={false}/></mesh>
   {mobileVisuals&&<mesh userData={{cameraIgnore:true}} position={[0,.25,0]}>
    <boxGeometry args={[1.3,.2,.09]}/>
    <meshStandardMaterial color="#536d80" metalness={.38} roughness={.36} emissive="#233b4d" emissiveIntensity={.35}/>
   </mesh>}
  </group>)}
 </group>;
}
export function CampusInteriorEffects({experience,targetRef}:{experience:ReturnType<typeof createCampusExperience>;targetRef?:RefObject<THREE.Group|null>}){
 const position=useMemo(()=>new THREE.Vector3(),[]),forward=useMemo(()=>new THREE.Vector3(),[]);
 useEffect(()=>()=>aresArrivalSound.setMusicInterior('v12-interior-complex',false),[]);
 useFrame(({camera})=>{
  const target=targetRef?.current;if(!target)return;target.getWorldPosition(position);
  aresArrivalSound.setMusicInterior('v12-interior-complex',experience.interiorAt(position.x,position.z));
  camera.getWorldDirection(forward);
  aresArrivalSound.setListener(position.x,position.y+1.15,position.z,forward.x,forward.y,forward.z);
 });
 return <group name="v12-interior-door-effects">{experience.doors.map(door=><PassageDoor key={door.id} door={door} targetRef={targetRef}/>)}</group>;
}

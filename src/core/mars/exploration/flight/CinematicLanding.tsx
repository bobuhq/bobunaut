import {resolveSceneObstacles} from './scene-obstacles.mjs';
import {flightTelemetry} from './flight-telemetry.mjs';
import {FlightHUD} from './FlightHUD';
import {LandingDust,dustPuff,thrusterDust} from './landing-fx.mjs';
import {ViewportOverlay} from './ViewportOverlay';
import {UNDERGLOW,xenonBeam} from './spacecraft-lighting.mjs';
import {nextCameraMode,MouseSteering,bindMouseSteering,cockpitLook} from '../genesis-v5/spacecraft-v3.mjs';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {BobuCharacterController} from '../components/BobuCharacterController';
import {BobuCharacterVisual} from '../components/BobuCharacterVisual';
import {MarsFollowCamera} from '../components/MarsFollowCamera';
import {DisembarkRig} from './DisembarkRig';
import {disembarkPhase,disembarkActorLocal,EXIT_DURATION,canDisembark} from './disembark-v1.mjs';
import {AresSpacecraft,Strut} from './AresSpacecraft';
import {useFrame,useThree} from '@react-three/fiber';
import {FlightV2,emptyInput,KEYMAP} from '../genesis-v5/flight-v2.mjs';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {loadAresGenesisTerrainData,ARES_GENESIS_SAFE_BOUNDARY_METERS,sampleAresGenesisRenderedSurfaceMeters as sample} from '../engine/AresGenesisTerrainData';
import {LandingGear,FEET,inspectSupport,footpadY} from '../genesis-v5/landing-gear.mjs';
import {flightAudio as audio} from './FlightAudio';

/** Development host: reuse the approved rig for either gear demonstration or one player flight controller. */
export function CinematicLanding({flight=false,obstacles=[],onAresEntry}:{flight?:boolean;obstacles?:any[];onAresEntry?:(spawn:[number,number,number],landing:{ship:[number,number,number];yaw:number})=>void}){
 const {scene}=useThree();
 const exitClock=useRef<number|null>(null);
 const [exitPhase,setExitPhase]=useState('FLIGHT');
 const exitPhaseRef=useRef('FLIGHT');
 const [onFoot,setOnFoot]=useState(false);
 const onFootRef=useRef(false);
 const actorRef=useRef<THREE.Group>(null);
 const footRef=useRef<THREE.Group>(null);
 const exitWorld=useRef<[number,number,number]>([110,0,-70]);
 const landedShip=useRef<{ship:[number,number,number];yaw:number}|null>(null); // BOBU_ARES_RESTORE_V1
 const exitElapsed=useRef(0);
 const lastExitStep=useRef(-1);
 // One-way handoff to the existing Ares walking world, not a second actor.
 useEffect(()=>{if(onFoot&&onAresEntry&&landedShip.current)onAresEntry([...exitWorld.current] as [number,number,number],landedShip.current);},[onFoot,onAresEntry]);
 const setExit=(stage:string)=>{if(exitPhaseRef.current!==stage){exitPhaseRef.current=stage;setExitPhase(stage);}};
 const obstacleScan=useRef(0);
 const [modelReady,setModelReady]=useState(false);
 const markModelReady=useCallback(()=>setModelReady(true),[]);
 const [telemetry,setTelemetry]=useState<ReturnType<typeof flightTelemetry>|null>(null);
 const touchLook=useRef({x:0,y:0});
 const lookPointer=useRef<{id:number;x:number;y:number}|null>(null);
 const dragLook=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(e.type==='pointerdown'){e.currentTarget.setPointerCapture(e.pointerId);lookPointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};}
  const p=lookPointer.current;if(!p||p.id!==e.pointerId)return;
  e.preventDefault();touchLook.current=cockpitLook(touchLook.current.x-(e.clientX-p.x)*.005,touchLook.current.y-(e.clientY-p.y)*.005);
  p.x=e.clientX;p.y=e.clientY;
 };
 const seat=useRef<THREE.Group>(null),cameraMode=useRef<'COCKPIT'|'CHASE'>('CHASE'),look=useRef({x:0,y:0}),[mode,setMode]=useState('CHASE');
 const fade=useRef<HTMLDivElement>(null),switchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const switchCamera=()=>{
  if(exitPhaseRef.current!=='FLIGHT'||onFootRef.current)return;
  if(switchTimer.current)return;
  if(fade.current)fade.current.style.opacity='1';
  // Move directly between safe eye positions under a short fade, never through hull panels.
  switchTimer.current=setTimeout(()=>{cameraMode.current=nextCameraMode(cameraMode.current);look.current={x:0,y:0};touchLook.current={x:0,y:0};mouse.current.look={x:0,y:0};setMode(cameraMode.current);if(fade.current)fade.current.style.opacity='0';switchTimer.current=null;},140);
 };
 useEffect(()=>()=>{if(switchTimer.current)clearTimeout(switchTimer.current);},[]);
 const mouse=useRef(new MouseSteering()),reticle=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!flight||onFoot)return;const canvas=document.querySelector('canvas');if(!canvas)return;return bindMouseSteering(mouse.current,canvas,window,document,switchCamera);},[flight,onFoot]);
 const engines=useRef<(THREE.Mesh|null)[]>([]);
 const controller=useRef<FlightV2|null>(null),input=useRef(emptyInput()),keys=useRef(new Set<string>()),touches=useRef(new Map<number,{action:string;value:number}>()),lastHud=useRef(0),focused=useRef(true);
 const cue=(kind:'extend'|'lock'|'impact'|'shutdown')=>{try{audio.landingCue(kind);}catch(error){console.error('Flight audio failed',error);}};
 const sync=()=>{const next=emptyInput();for(const code of keys.current){const mapping=KEYMAP[code as keyof typeof KEYMAP];if(mapping){const [action,value]=mapping;next[action as keyof typeof next]+=Number(value);}}for(const {action,value} of touches.current.values()){if(action in next)next[action as keyof typeof next]+=value;}for(const k of Object.keys(next) as (keyof typeof next)[])next[k]=Math.max(-1,Math.min(1,next[k]));input.current=next;};
 const release=()=>{keys.current.clear();touches.current.clear();input.current=emptyInput();controller.current?.pause();};
 const action=(name:string)=>{if(exitPhaseRef.current!=='FLIGHT')return;if(name==='gear'){controller.current?.toggleGear();}if(name==='touchdown')controller.current?.requestTouchdown();};
 useEffect(()=>{if(!flight)return;
  const down=(e:KeyboardEvent)=>{if(onFootRef.current||exitPhaseRef.current!=='FLIGHT')return;if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(e.code in KEYMAP||['KeyG','KeyF'].includes(e.code)){e.preventDefault();keys.current.add(e.code);sync();if(!e.repeat)action(e.code==='KeyG'?'gear':e.code==='KeyF'?'touchdown':'');}};
  const up=(e:KeyboardEvent)=>{keys.current.delete(e.code);sync();};
  const blur=()=>{focused.current=false;release();},focus=()=>{focused.current=true;release();},visibility=()=>release();
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
  return()=>{release();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);};
 },[flight]);
 const hold=(actionName:string,value:number)=>(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touches.current.set(e.pointerId,{action:actionName,value});sync();};
 const unhold=(e:React.PointerEvent<HTMLElement>)=>{touches.current.delete(e.pointerId);touches.current.delete(-e.pointerId-1);sync();};
 const joystick=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.type==='pointerdown')e.currentTarget.setPointerCapture(e.pointerId);if(!e.currentTarget.hasPointerCapture(e.pointerId))return;e.preventDefault();const b=e.currentTarget.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)/(b.width*.4),y=(e.clientY-b.top-b.height/2)/(b.height*.4);touches.current.set(e.pointerId,{action:'lateral',value:Math.max(-1,Math.min(1,x))});touches.current.set(-e.pointerId-1,{action:'forward',value:Math.max(-1,Math.min(1,-y))});sync();};
 const [terrain,setTerrain]=useState<Awaited<ReturnType<typeof loadAresGenesisTerrainData>>|null>(null);
 useEffect(()=>{let live=true;loadAresGenesisTerrainData().then(t=>{if(live)setTerrain(t);}).catch(console.error);return()=>{live=false;audio.stopLanding();};},[]);
 const data=useMemo(()=>{if(!terrain)return null;const surface=(x:number,z:number)=>sample(terrain,x,z);const support=inspectSupport(surface);return {support};},[terrain]);
 useEffect(()=>{if(flight&&terrain){controller.current=new FlightV2((x:number,z:number)=>sample(terrain,x,z),obstacles,ARES_GENESIS_SAFE_BOUNDARY_METERS);gear.current=controller.current.gear;}},[flight,terrain]);
 const gear=useRef(new LandingGear()),ship=useRef<THREE.Group>(null),pads=useRef<(THREE.Mesh|null)[]>([]),lights=useRef<(THREE.SpotLight|null)[]>([]),preDust=useRef<THREE.Group>(null),prePuffs=useRef<(THREE.Mesh|null)[]>([]),cloud=useRef<THREE.Group>(null),label=useRef<HTMLDivElement>(null);
 const dustBurst=useRef(new LandingDust()),puffs=useRef<(THREE.Mesh|null)[]>([]);
 const landingTarget=useMemo(()=>{const target=new THREE.Object3D();target.name='xenon-ground-world-target';return target;},[]);
 const runtime=useRef({time:0,start:0,active:false,last:'STOWED',power:0});
 const dustTexture=useMemo(()=>{const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const c=canvas.getContext("2d")!;const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,"rgba(255,255,255,.65)");g.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);},[]);
 useEffect(()=>()=>dustTexture.dispose(),[dustTexture]);
 const start=()=>{if(!data)return;audio.stopLanding();gear.current=new LandingGear();gear.current.transition('DEPLOYING');dustBurst.current=new LandingDust();runtime.current={time:0,start:0,active:true,last:'STOWED',power:0};audio.landingCue('extend');};
 useEffect(()=>{if(flight)return;window.addEventListener('ares-landing-replay',start);return()=>window.removeEventListener('ares-landing-replay',start);},[data,flight]);
 useFrame(({camera,clock},dt)=>{
  if(!data||!ship.current||(flight&&!modelReady))return;
  const r=runtime.current,g=gear.current;r.time+=Math.min(dt,.05);
  const f=controller.current;
  // Recover vertical bounds from the actual rendered structures, not a guessed
  // reservation height. Unknown/unloaded obstacles remain solid (fail closed).
  if(f&&clock.elapsedTime>obstacleScan.current){
   obstacleScan.current=clock.elapsedTime+2;
   f.obstacles=resolveSceneObstacles(scene,obstacles,ship.current);
  }
  if(flight&&f){if(mouse.current.alt&&input.current.yaw===0&&f.status==='MANUAL')f.yawVelocity=0;const mouseYaw=mouse.current.step(Math.min(dt,.05));look.current=cockpitLook(mouse.current.look.x+touchLook.current.x,mouse.current.look.y+touchLook.current.y);if(reticle.current){reticle.current.style.transform=`translateX(${ -mouse.current.axis*65}px)`;reticle.current.textContent=mouse.current.active?'⊕':'·';}f.step(performance.now(),{...input.current,yaw:Math.max(-1,Math.min(1,input.current.yaw+mouseYaw))},!document.hidden&&focused.current);
   // Post-touchdown handoff never writes the flight controller's position or velocity.
   if(canDisembark(f)){
    if(exitClock.current===null){exitClock.current=clock.elapsedTime;lastExitStep.current=-1;release();cameraMode.current='COCKPIT';setMode('COCKPIT');look.current={x:0,y:0};touchLook.current={x:0,y:0};}
    exitElapsed.current=Math.max(0,clock.elapsedTime-exitClock.current);
    const stage=disembarkPhase(exitElapsed.current);
    if(stage==='HATCH'&&exitPhaseRef.current==='COCKPIT'){
     audio.door('spacecraft-exit-hatch',true,[f.x,f.y,f.z]);
     cameraMode.current='CHASE';setMode('CHASE');
    }
    if(stage==='STAIRS'){
     const step=Math.min(7,Math.max(0,Math.floor((exitElapsed.current-5.2)/.9)));
     if(step>lastExitStep.current){lastExitStep.current=step;audio.exitStep(step);}
    }
    setExit(stage);
    if(stage==='GROUND'&&!onFootRef.current){
     const local=disembarkActorLocal(EXIT_DURATION),c=Math.cos(f.yaw),si=Math.sin(f.yaw);
     const x=f.x+c*local.x+si*local.z,z=f.z-si*local.x+c*local.z;
     exitWorld.current=[x,sample(terrain!,x,z),z];landedShip.current={ship:[f.x,f.y,f.z],yaw:f.yaw};onFootRef.current=true;setOnFoot(true);
    }
   }

   if(g.state!==r.last){if(g.state==='DEPLOYING')cue('extend');if(g.state==='LOCKED'||g.state==='DESCENDING'&&r.last==='DEPLOYING')cue('lock');if(g.state==='GROUND_CONTACT')cue('impact');if(g.state==='SETTLED')cue('shutdown');}r.last=g.state;
   if(performance.now()-lastHud.current>100 ){try{audio.update(f.x,f.y,f.z,0,0,-1,[f.x,f.y,f.z]);}catch(error){if(r.start===0){console.error('Flight audio update failed',error);r.start=1;}}lastHud.current=performance.now();setTelemetry(flightTelemetry(f));}
  }else g.step(dt);
  if(!flight&&r.active&&g.state==='LOCKED')g.transition('DESCENDING');
  // Retain the original noninteractive demonstration when flight mode is off.
  const descent=g.state==='DESCENDING'?Math.min(g.elapsed/8,1):0;
  const altitude=flight&&f?f.y-5.15-f.inspect(f.x,f.z).highest:30-descent*18;
  if(flight&&f){ship.current.position.set(f.x,f.y,f.z);ship.current.rotation.y=f.yaw;ship.current.updateMatrixWorld(true);const pc=camera as THREE.PerspectiveCamera;const near=cameraMode.current==='COCKPIT'?.05:.3;if(pc.near!==near){pc.near=near;pc.updateProjectionMatrix();}if(!onFootRef.current){
    if(exitPhaseRef.current==='HATCH'||exitPhaseRef.current==='STAIRS'){
     const actor=actorRef.current;
     if(actor){const focus=actor.getWorldPosition(new THREE.Vector3());const c=Math.cos(f.yaw),si=Math.sin(f.yaw);camera.position.set(focus.x+si*8+c*6,focus.y+4,focus.z+c*8-si*6);camera.lookAt(focus.x,focus.y+1,focus.z);}
    }else if(cameraMode.current==='COCKPIT'&&seat.current){seat.current.getWorldPosition(camera.position);seat.current.getWorldQuaternion(camera.quaternion);camera.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(look.current.y,look.current.x,0,'YXZ')));}else{camera.position.set(f.x+Math.sin(f.yaw)*38,f.y+22,f.z+Math.cos(f.yaw)*38);camera.lookAt(f.x,f.y,f.z);}
   }}else ship.current.position.set(110,data.support.highest+altitude,-70);
  if(!flight&&g.state==='DESCENDING'&&g.elapsed>=10){g.transition('RETRACTING');audio.landingCue('shutdown');}
  if(g.state==='STOWED'&&r.last==='RETRACTING')r.active=false;
  r.power=flight&&f?f.power:g.state==='DESCENDING'?1:g.state==='DEPLOYING'?.45:Math.max(0,r.power-dt*.4);

   if(g.state!==r.last){if(g.state==='DESCENDING')audio.landingCue('lock');r.last=g.state;}
  for(let i=0;i<4;i++){
   const pad=pads.current[i];
   if(pad){
    const [lx,lz]=FEET[i],c=flight&&f?Math.cos(f.yaw):1,s=flight&&f?Math.sin(f.yaw):0;
    pad.position.x=lx*(.65+.35*g.extension);pad.position.z=lz*(.65+.35*g.extension);
    let ground=flight&&f?sample(terrain!,f.x+lx*c+lz*s,f.z-lx*s+lz*c):data.support.heights[i];
    // Match the five-sample support test: horizontal pad underside clears every corner.
    if(flight&&f)for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])ground=Math.max(ground,sample(terrain!,f.x+(lx+dx)*c+(lz+dz)*s,f.z-(lx+dx)*s+(lz+dz)*c));
    const high=flight&&f?f.inspect(f.x,f.z).highest:data.support.highest;
    const clearance=ship.current.position.y-high-5.15;
    const contact=['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(g.state);
    const adjustment=Math.max(0,1-Math.max(0,clearance))*(high-ground);
    pad.position.y=contact?ground+.15-ship.current.position.y:Math.max(ground+.15-ship.current.position.y,-5*g.extension-adjustment);
   }
  }
  for(const engine of engines.current)if(engine)(engine.material as THREE.MeshBasicMaterial).opacity=r.power*UNDERGLOW.engineOpacity;
  // Dedicated xenon lamps stay on after engine shutdown; dust has its own lifetime.
  const groundX=flight&&f?f.x:110,groundZ=flight&&f?f.z:-70;
  const groundY=sample(terrain!,groundX,groundZ);
  // Scene-root target uses world coordinates; update after ship motion every frame.
  landingTarget.position.set(groundX,groundY,groundZ);
  landingTarget.updateMatrixWorld(true);
  const lampAGL=ship.current.position.y-5.15-groundY;
  const beam=xenonBeam(lampAGL,g.state==='SETTLED');
  const isContact=['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(g.state);
  if(preDust.current){const level=thrusterDust(altitude,r.power,isContact);preDust.current.visible=level>0;for(let i=0;i<prePuffs.current.length;i++){const puff=prePuffs.current[i];if(!puff)continue;const a=i*Math.PI/4+r.time*.12;const x=groundX+Math.cos(a)*5,z=groundZ+Math.sin(a)*5;puff.position.set(x,sample(terrain!,x,z)+.35,z);puff.quaternion.copy(camera.quaternion);puff.scale.set(4,1.1,1);(puff.material as THREE.MeshBasicMaterial).opacity=level;}}
  for(const light of lights.current)if(light){light.intensity=beam.intensity;light.angle=beam.angle;light.distance=beam.distance;light.shadow.camera.far=beam.distance;light.shadow.camera.updateProjectionMatrix();}
  const burst=dustBurst.current;
  const opacity=burst.step(dt,{height:altitude,descending:flight&&f?f.vy<-.1:g.state==='DESCENDING',contact:['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(g.state),x:groundX,z:groundZ,yaw:flight&&f?f.yaw:0});
  if(cloud.current){cloud.current.visible=opacity>0;
   if(opacity>0)for(let i=0;i<puffs.current.length;i++){
    const puff=puffs.current[i];if(!puff)continue;
    const p=dustPuff(i,burst.age),c=Math.cos(burst.yaw),s=Math.sin(burst.yaw),x=burst.x+p.x*c+p.z*s,z=burst.z-p.x*s+p.z*c;
    puff.position.set(x,sample(terrain!,x,z)+p.lift,z);
    puff.quaternion.copy(camera.quaternion);puff.scale.set(p.scale*1.6,p.scale,1);
    (puff.material as THREE.MeshBasicMaterial).opacity=opacity*.22;
   }
  }
  if(label.current)label.current.textContent=`${g.state} · AIRBORNE ONLY · ${data.support.reason} · tilt ${data.support.tilt.toFixed(1)}° · relief ${data.support.relief.toFixed(2)}m`;
 });
 useEffect(()=>{if(!flight||!import.meta.env.DEV)return;const api={state:()=>{const f=controller.current;return f?{lastBlocker:f.lastBlocker,disembarkPhase:exitPhaseRef.current,onFoot:onFootRef.current,exitWorld:exitWorld.current,modelReady,x:f.x,y:f.y,z:f.z,vx:f.vx,vy:f.vy,vz:f.vz,yaw:f.yaw,status:f.status,trigger:f.trigger,activeSeconds:f.activeSeconds,autoSeconds:f.autoSeconds,phase:f.phase,deadlineReason:f.deadlineReason,touchdownSeconds:f.touchdownSeconds,dustEvents:dustBurst.current.events,dustAge:dustBurst.current.age,gear:f.gear.state,support:f.support,target:f.target,power:f.power,cameraMode:cameraMode.current,look:look.current,mouseActive:mouse.current.active,yawVelocity:f.yawVelocity}:null;}};Object.assign(window,{__flightV2:api});return()=>{delete (window as any).__flightV2;};},[flight,modelReady]);
 if(!data)return null;
 return <>{flight&&<ViewportOverlay><div className="flight-overlay"><div ref={fade} aria-hidden="true" style={{position:'fixed',inset:0,background:'#02070c',opacity:0,transition:'opacity 140ms ease',pointerEvents:'none',zIndex:200}}/>
 {flight&&!modelReady&&<div role="status" style={{position:'fixed',inset:0,display:'grid',placeItems:'center',background:'#071016',color:'#dcefff',fontFamily:'monospace',letterSpacing:2,zIndex:250,pointerEvents:'none'}}>BOBU ARES · LOADING SPACECRAFT</div>}
 {exitPhase==='FLIGHT'&&mode==='CHASE'&&modelReady&&<FlightHUD telemetry={telemetry} onAudio={()=>audio.toggle()}/>}

 {exitPhase!=='FLIGHT'&&<div role="status" style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',pointerEvents:'none',color:'#bcecff',background:'#07121ad9',padding:'9px 18px',borderRadius:7,fontFamily:'monospace',fontSize:13,zIndex:5}}>{exitPhase==='COCKPIT'?'BOBU · TOUCHDOWN / COCKPIT':exitPhase==='HATCH'?'BOBU · EXIT HATCH OPENING':exitPhase==='STAIRS'?'BOBU · DESCENDING TO MARS':'BOBU · MARS EXPLORATION · WASD'}</div>}
 {exitPhase==='FLIGHT'&&<><div ref={reticle} className="flight-reticle" aria-label="Mouse steering direction">·</div><div className="flight-touch"><div role="group" aria-label="Directional joystick" className="flight-stick" onPointerDown={joystick} onPointerMove={joystick} onPointerUp={unhold} onPointerCancel={unhold} onLostPointerCapture={unhold}>✥<small>MOVE</small></div>
 <div role="group" className="flight-look" aria-label="Cockpit look control" onPointerDown={dragLook} onPointerMove={dragLook} onPointerUp={()=>{lookPointer.current=null;}} onPointerCancel={()=>{lookPointer.current=null;}} style={{pointerEvents:'auto',touchAction:'none',background:'#102735cc',color:'#8efaff',padding:18,border:'1px solid #578ba2',borderRadius:12}}>DRAG TO LOOK</div><div className="flight-buttons">{[['ASCEND','vertical',1],['DESCEND','vertical',-1],['ROTATE LEFT','yaw',1],['ROTATE RIGHT','yaw',-1]].map(([label,a,v])=><button key={label} onPointerDown={hold(String(a),Number(v))} onPointerUp={unhold} onPointerCancel={unhold} onLostPointerCapture={unhold}>{label}</button>)}<button data-testid="camera-mode" onClick={switchCamera}>{mode==='CHASE'?'COCKPIT':'EXTERIOR'} · C</button><button onClick={()=>action('gear')}>GEAR · G</button><button onClick={()=>action('touchdown')}>TOUCHDOWN · F</button></div></div></>}
 </div></ViewportOverlay>}<primitive object={landingTarget}/><group name="dev-only-cinematic-landing">
  {!flight&&<Html position={[110,data.support.highest+35,-70]} center distanceFactor={70}><div style={{background:'#151525',color:'#eee',padding:12,width:340}}><b>ARES · DEVELOPMENT TEST RIG</b><div ref={label}>STOWED · touchdown disabled</div><button onClick={start}>REPLAY GEAR / DESCENT</button><div>Unsafe ring: airborne demonstration; no placement authorization.</div></div></Html>}
  <group ref={ship} visible={!flight||modelReady} position={[110,data.support.highest+30,-70]}>
   <AresSpacecraft exitActive={exitClock.current!==null} cockpit={mode==='COCKPIT'} seat={seat} telemetry={telemetry} onAction={action} onExteriorReady={markModelReady}/>
   {exitClock.current!==null&&<DisembarkRig elapsedRef={exitElapsed} actorRef={actorRef} onFoot={onFoot}/>}
   {FEET.map(([x,z],i)=><group key={i}>
    <GearLink pad={()=>pads.current[i]} x={x} z={z}/>
    <mesh ref={v=>{pads.current[i]=v;}} position={[x,-5,z]}><boxGeometry args={[2,.3,2]}/><meshStandardMaterial color="#a3adb0" metalness={.7} roughness={.48}/>
     <mesh position={[0,.18,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.64,.065,8,20]}/><meshStandardMaterial color="#53616a" metalness={.7} roughness={.5}/></mesh>
     {[-.7,.7].flatMap(a=>[-.7,.7].map(b=><mesh key={`${a}/${b}`} position={[a,.18,b]}><cylinderGeometry args={[.065,.065,.06,6]}/><meshStandardMaterial color="#48545b" metalness={.7} roughness={.4}/></mesh>))}
    </mesh>
   </group>)}
   {[0].map(i=><group key={i} position={[0,-2.6,0]}><spotLight ref={v=>{lights.current[i]=v;}} target={landingTarget} color={UNDERGLOW.color} intensity={0} castShadow shadow-mapSize={[1024,1024]} shadow-camera-near={.15} shadow-bias={-.0002} distance={UNDERGLOW.distance} angle={.42} penumbra={.65} decay={2}/><mesh position={[0,-.08,0]} rotation={[Math.PI,0,0]}><cylinderGeometry args={[.24,.32,.16,20]}/><meshStandardMaterial color="#b9cad2" metalness={.85} roughness={.22}/></mesh><mesh position={[0,-.17,0]} rotation={[Math.PI/2,0,0]}><sphereGeometry args={[.20,16,8]}/><meshBasicMaterial color="#a1dfff" toneMapped={false}/></mesh><mesh ref={v=>{engines.current[i]=v;}} visible={false}><coneGeometry args={[1,3,12]}/><meshBasicMaterial color={i?'#34bbff':UNDERGLOW.color} transparent opacity={0} toneMapped={false}/></mesh></group>)}
  </group>
  {flight&&onFoot&&!onAresEntry&&<>
    <BobuCharacterController characterRef={footRef} startPosition={exitWorld.current} collisionObstacles={obstacles}>
      <BobuCharacterVisual />
    </BobuCharacterController>
    <MarsFollowCamera targetRef={footRef} />
  </>}
  <group ref={preDust} visible={false} name="pre-touchdown-thruster-dust">{Array.from({length:8},(_,i)=><mesh key={i} ref={v=>{prePuffs.current[i]=v;}}><planeGeometry args={[1,1]}/><meshBasicMaterial map={dustTexture} color="#b06b47" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide}/></mesh>)}</group>
  <group ref={cloud} visible={false} name="bounded-touchdown-dust">{Array.from({length:20},(_,i)=><mesh key={i} ref={v=>{puffs.current[i]=v;}}><planeGeometry args={[1,1]}/><meshBasicMaterial map={dustTexture} color="#b97753" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide}/></mesh>)}</group>
 </group></>;
}

export function GearLink({pad,x,z}:{pad:()=>THREE.Mesh|null;x:number;z:number}){
 const a=useRef(new THREE.Vector3(x*.65,-1,z*.65)),b=useRef(new THREE.Vector3(x,-5,z)),c=useRef(new THREE.Vector3(x*.5,-1.1,z*.5)),sleeve=useRef(new THREE.Vector3()),hinge=useRef<THREE.Mesh>(null);
 useFrame(()=>{const p=pad();if(p){b.current.copy(p.position);b.current.y+=.15;sleeve.current.copy(a.current).lerp(b.current,.55);hinge.current?.position.copy(b.current);}});
 return <group><Strut a={a.current} b={b.current} r={.23}/><Strut a={c.current} b={b.current} r={.11}/><Strut a={a.current} b={sleeve.current} r={.31}/><mesh ref={hinge} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.25,.25,.65,12]}/><meshStandardMaterial color="#687d88" metalness={.8} roughness={.3}/></mesh><mesh position={[x*.65,-1,z*.65]}><sphereGeometry args={[.38,12,8]}/><meshStandardMaterial color="#e6a343" metalness={.7} roughness={.3}/></mesh></group>;
}

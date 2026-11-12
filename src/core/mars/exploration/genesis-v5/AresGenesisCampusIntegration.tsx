import {Component, type ReactNode, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject} from 'react';
import * as THREE from 'three';
import {ARES_GENESIS_CAMPUS_ENABLED, prepareProductionCampus, productionCampusFloor, productionCampusObstacles, type ProductionCampusSite} from './production-site.mjs';
import {loadAresGenesisTerrainData, sampleAresGenesisRenderedSurfaceMeters} from '../engine/AresGenesisTerrainData';
import {MARS_SURFACE_ROCK_COLLISION_OBSTACLES} from '../components/MarsSurfaceRocks';
import {genesisWorldToLocal, genesisLocalToWorld} from './3d/production-collision-adapter.mjs';
import {cameraSolids, constrainGenesisEye} from './3d/interior-camera.mjs';
import {reviewAresGenesisPlacement} from './AresColonyOccupancyAdapter';

const loadBase=()=>import('./3d/GenesisV5Experience');
const loadCampus=()=>import('./V11ResearchCampus');
const Base=lazy(()=>loadBase().then(m=>({default:m.GenesisSharedBaseScene})));
const Campus=lazy(()=>loadCampus().then(m=>({default:m.MarsResearchCampus})));

/** Asset/render failures leave the original Hub selected. */
class CampusLoadBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error){console.error('PLACEMENT_BLOCKED: Genesis scene failed',error);this.props.onFailure();}
 render(){return this.state.failed?null:this.props.children;}
}

/** Host-owned controller/camera extension. No player, renderer, lights or service calls. */
export function useAresGenesisCampusIntegration(){
 const [sceneReady,setSceneReady]=useState(false);
 const markSceneReady=useCallback(()=>setSceneReady(true),[]);
 const [site,setSite]=useState<ProductionCampusSite|null>(null);
 const [placementStatus,setPlacementStatus]=useState<'PLACEMENT_BLOCKED'|'READY'>('PLACEMENT_BLOCKED');
 const markSceneFailed=useCallback(()=>{setSceneReady(false);setSite(null);setPlacementStatus('PLACEMENT_BLOCKED');},[]);
 const [doors,setDoors]=useState({surface:false,hub:false,habitat:false});
 const doorStateRef=useRef({surface:0,hub:0,habitat:0});
 useEffect(()=>{
  if(!ARES_GENESIS_CAMPUS_ENABLED)return;
  let active=true;
  let expiryTimer:ReturnType<typeof setTimeout>|undefined;
  const revoke=()=>{if(!active)return;setSceneReady(false);setSite(null);setPlacementStatus('PLACEMENT_BLOCKED');};
  const poll=async()=>{
   try {
    const review=await reviewAresGenesisPlacement();
    if(!active)return;
    if(review.status!=='approved' || !('site' in review) || !('expiresAt' in review)) {revoke();return;}
    // Approval is a fresh backend response; the scene is never authorized by site source constants.
    const approved=review.site;
    const expiresAt=review.expiresAt;
    if(expiryTimer)clearTimeout(expiryTimer);
    expiryTimer=setTimeout(revoke,Math.max(0,expiresAt-Date.now()-15000));
    const terrain=await loadAresGenesisTerrainData();
    const next=prepareProductionCampus({
     ...(approved as Parameters<typeof prepareProductionCampus>[0]),
     sample:(x,z)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z),
     occupied:[...(approved.occupied as Parameters<typeof prepareProductionCampus>[0]['occupied']),
      ...MARS_SURFACE_ROCK_COLLISION_OBSTACLES.map(o=>({...o,kind:'circle' as const})),
      {kind:'circle' as const,x:18,z:-28,radius:1.35}]
    });
    await Promise.all([loadBase(),loadCampus()]);
    if(active&&Date.now()<expiresAt-15000){setSite(next);setPlacementStatus('READY');}
   } catch(error) {console.warn('PLACEMENT_BLOCKED',error);revoke();}
  };
  void poll();
  const repeat=setInterval(()=>{void poll();},12000);
  return ()=>{active=false;clearInterval(repeat);if(expiryTimer)clearTimeout(expiryTimer);};
 },[]);
 const obstacles=useMemo(()=>site && sceneReady?productionCampusObstacles(site,doors):[],[site,doors,sceneReady]);
 const floor=useCallback((_terrain:unknown,x:number,z:number)=>site?productionCampusFloor(site,x,z):null,[site]);
 const onDoorStateChange=useCallback((id:keyof typeof doors,open:boolean)=>setDoors(current=>current[id]===open?current:{...current,[id]:open}),[]);
 const constrainCamera=useCallback((look:THREE.Vector3,eye:THREE.Vector3)=>{
  if(!site)return;
  const point=(p:THREE.Vector3)=>{const [x,z]=genesisWorldToLocal(p.x,p.z,site.placement);return {x,y:p.y-site.rootY,z};};
  const localEye=point(eye);constrainGenesisEye(point(look),localEye,[...cameraSolids(doorStateRef.current),...site.plan.colliders]);
  const [x,z]=genesisLocalToWorld(localEye.x,localEye.z,site.placement);eye.set(x,localEye.y+site.rootY,z);
 },[site]);
 const interiorAt=useCallback((x:number,z:number)=>site!==null && sceneReady && productionCampusFloor(site,x,z)!==null && (()=>{const [lx,lz]=genesisWorldToLocal(x,z,site.placement);return Math.abs(lx)<7 && lz>-37 && lz<13.2;})(),[site,sceneReady]);
 return {interiorAt,markSceneFailed,markSceneReady,replacementReady:ARES_GENESIS_CAMPUS_ENABLED && placementStatus==='READY' && site!==null && sceneReady,site,placementStatus,obstacles,walkableSurface:site && sceneReady?floor:undefined,constrainCamera:site && sceneReady?constrainCamera:undefined,doorStateRef,onDoorStateChange};
}
function SceneCommitted({onReady}:{onReady:()=>void}){useEffect(onReady,[onReady]);return null;}
export function AresGenesisCampusIntegration({integration,targetRef}:{integration:ReturnType<typeof useAresGenesisCampusIntegration>;targetRef:RefObject<THREE.Group|null>}){
 const {site,doorStateRef,onDoorStateChange}=integration;
 if(!ARES_GENESIS_CAMPUS_ENABLED || integration.placementStatus==='PLACEMENT_BLOCKED' || !site)return null;
 return <CampusLoadBoundary onFailure={integration.markSceneFailed}><Suspense fallback={null}><group visible={integration.replacementReady}><SceneCommitted onReady={integration.markSceneReady}/><Base position={[site.placement.x,site.rootY,site.placement.z]} rotationY={site.placement.rotationY*Math.PI/180} targetRef={targetRef} doorStateRef={doorStateRef} onDoorStateChange={onDoorStateChange} surfaceAtLocal={site.surfaceAtLocal} rampEndLocalY={site.rampEndY-site.rootY}/><group position={[site.placement.x,site.rootY,site.placement.z]} rotation={[0,site.placement.rotationY*Math.PI/180,0]}><Campus surface={site.surfaceAtLocal}/></group></group></Suspense></CampusLoadBoundary>;
}

import {Component, type ReactNode, lazy, Suspense, useCallback, useEffect, useMemo, useState} from 'react';
import * as THREE from 'three';
import {ARES_GENESIS_CAMPUS_ENABLED} from './production-site.mjs';
import {prepareIntegratedCampus,integratedCampusFloor,integratedReservations,type IntegratedCampusSite} from './integrated-campus.mjs';
import {areasOverlap} from './colony-occupancy.mjs';
import {SPACECRAFT_RADIUS} from './spacecraft-v3.mjs';
import {loadAresGenesisTerrainData, sampleAresGenesisRenderedSurfaceMeters} from '../engine/AresGenesisTerrainData';
import {MARS_SURFACE_ROCK_COLLISION_OBSTACLES} from '../components/MarsSurfaceRocks';
import {genesisWorldToLocal, genesisLocalToWorld} from './3d/production-collision-adapter.mjs';
import {constrainGenesisEye} from './3d/interior-camera.mjs';
import {reviewAresGenesisPlacement} from './AresColonyOccupancyAdapter';

const flightReservation=integratedReservations().map(r=>({...r,groundOnly:true}));
const noFlightReservation:typeof flightReservation=[];
const loadCampus=()=>import('./IntegratedResearchCampus');
const Campus=lazy(()=>loadCampus().then(m=>({default:m.IntegratedResearchCampus})));

/** Asset/render failures leave the original Hub selected. */
class CampusLoadBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error){console.error('PLACEMENT_BLOCKED: Genesis scene failed',error);this.props.onFailure();}
 render(){return this.state.failed?null:this.props.children;}
}

/** Host-owned controller/camera extension. No player, renderer, lights or service calls. */
export function useAresGenesisCampusIntegration(parkedShip?:[number,number,number]){
 const [sceneReady,setSceneReady]=useState(false);
 const markSceneReady=useCallback(()=>setSceneReady(true),[]);
 const [site,setSite]=useState<IntegratedCampusSite|null>(null);
 const [placementStatus,setPlacementStatus]=useState<'PLACEMENT_BLOCKED'|'READY'>('PLACEMENT_BLOCKED');
 const markSceneFailed=useCallback(()=>{setSceneReady(false);setSite(null);setPlacementStatus('PLACEMENT_BLOCKED');},[]);
 const parkedClear=!parkedShip||!flightReservation.some(r=>areasOverlap(r,{id:'parked-ares-v6',kind:'circle',x:parkedShip[0],z:parkedShip[2],radius:SPACECRAFT_RADIUS+3}));
 useEffect(()=>{
  if(!ARES_GENESIS_CAMPUS_ENABLED)return;
  let active=true;
  let polling=false;
  let expiryTimer:ReturnType<typeof setTimeout>|undefined;
  const revoke=()=>{if(!active)return;setSceneReady(false);setSite(null);setPlacementStatus('PLACEMENT_BLOCKED');};
  if(!parkedClear){revoke();return;}
  const poll=async()=>{
   if(polling)return;
   polling=true;
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
    const next=prepareIntegratedCampus({
     ...approved,
     sample:(x:number,z:number)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z),
     occupied:[...(approved.occupied as {x:number;z:number;radius:number}[]),
      ...(parkedShip?[{id:'parked-ares-v6',kind:'circle',x:parkedShip[0],z:parkedShip[2],radius:SPACECRAFT_RADIUS+3}]:[]),
      ...MARS_SURFACE_ROCK_COLLISION_OBSTACLES.map(o=>({...o,kind:'circle' as const})),
      {kind:'circle' as const,x:18,z:-28,radius:1.35}]
    });
    await loadCampus();
    if(active&&Date.now()<expiresAt-15000){setSite(next);setPlacementStatus('READY');}
   } catch(error) {console.warn('PLACEMENT_BLOCKED',error);revoke();}
   finally {polling=false;}
  };
  void poll();
  const repeat=setInterval(()=>{void poll();},12000);
  return ()=>{active=false;clearInterval(repeat);if(expiryTimer)clearTimeout(expiryTimer);};
 },[parkedShip,parkedClear]);
 const obstacles=useMemo(()=>site && sceneReady && parkedClear?site.obstacles:[],[site,parkedClear,sceneReady]);
 const floor=useCallback((_terrain:unknown,x:number,z:number)=>site?integratedCampusFloor(site,x,z):null,[site]);

 const constrainCamera=useCallback((look:THREE.Vector3,eye:THREE.Vector3)=>{
  if(!site)return;
  const point=(p:THREE.Vector3)=>{const [x,z]=genesisWorldToLocal(p.x,p.z,site.placement);return {x,y:p.y-site.rootY,z};};
  const localEye=point(eye);constrainGenesisEye(point(look),localEye,site.cameraSolids);
  const [x,z]=genesisLocalToWorld(localEye.x,localEye.z,site.placement);eye.set(x,localEye.y+site.rootY,z);
 },[site]);
 // Existing Hub interior and stairs remain owned by MarsFollowCamera/Hub sampler.
 const interiorAt=useCallback(()=>false,[]);
 const flightObstacles=useMemo(()=>site&&sceneReady&&parkedClear?[...flightReservation,...site.obstacles]:noFlightReservation,[site,sceneReady,parkedClear]);
 return {flightObstacles,interiorAt,markSceneFailed,markSceneReady,campusReady:ARES_GENESIS_CAMPUS_ENABLED && placementStatus==='READY' && site!==null && sceneReady && parkedClear,site:parkedClear?site:null,placementStatus,obstacles,walkableSurface:site && sceneReady && parkedClear?floor:undefined,constrainCamera:site && sceneReady && parkedClear?constrainCamera:undefined};
}
function SceneCommitted({onReady}:{onReady:()=>void}){useEffect(onReady,[onReady]);return null;}
export function AresGenesisCampusIntegration({integration}:{integration:ReturnType<typeof useAresGenesisCampusIntegration>}){
 const {site}=integration;
 if(!ARES_GENESIS_CAMPUS_ENABLED || integration.placementStatus==='PLACEMENT_BLOCKED' || !site)return null;
 return <CampusLoadBoundary onFailure={integration.markSceneFailed}><Suspense fallback={null}><group visible={integration.campusReady}><SceneCommitted onReady={integration.markSceneReady}/><Campus site={site}/></group></Suspense></CampusLoadBoundary>;
}

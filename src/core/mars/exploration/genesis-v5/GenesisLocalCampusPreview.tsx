import {GreenLandingZone} from './GreenLandingZone';
import {landingPreviewRockVisible} from './green-landing-zone.mjs';
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { aresArrivalSound } from "../audio/AresArrivalSound";

type GenesisPreviewAudioCompat = {
  door?: (id: string, open: boolean, position: [number, number, number]) => void;
  setMusicInterior?: (area: string, inside: boolean) => void;
  setListener?: (x: number, y: number, z: number, dx: number, dy: number, dz: number) => void;
  stopDoor?: (id: string) => void;
};
const previewAudio = aresArrivalSound as typeof aresArrivalSound & GenesisPreviewAudioCompat;
 // BOBU_ARES_RESTORE_V1
import {
  loadAresGenesisTerrainData,
  sampleAresGenesisRenderedSurfaceMeters,
} from "../engine/AresGenesisTerrainData";
import { entryHeight } from './v11-composition.mjs';
import { createV11CampusPlan } from './v11-campus-plan.mjs';
import { towers } from './v11-composition.mjs';
import { createGenesisCollisionObstacles, genesisInteriorFloorAt, genesisBlockingObstacle } from './3d/production-collision-adapter.mjs';
import type { GenesisDoorId } from './3d/GenesisV5Experience';
import type { AresGenesisTerrainData } from '../engine/AresGenesisTerrainData';
const placement = {x:-16,z:-73,rotationY:0 as const};

// Artistic staging only. Never consumed by the production placement adapter.
const PREVIEW_X = placement.x;
const PREVIEW_Z = placement.z;

const rockVisible=(r:{x:number;z:number;width?:number;depth?:number;radius?:number})=>{
    const m=Math.max(r.width??r.radius??0,r.depth??r.radius??0)*.8;
    return landingPreviewRockVisible(r) && (r.x+m < -88 || r.x-m > 35 || r.z+m < -125 || r.z-m > 2);
  };

type PreviewSite = {
  rootY: number;
  rampEnd: number;
  surface: (x: number, z: number) => number;
};

const GenesisBase = lazy(async () => {
  const module = await import("./3d/GenesisV5Experience");
  return { default: module.GenesisSharedBaseScene };
});

const GenesisCampus = lazy(async () => {
  const module = await import("./V11ResearchCampus");
  return { default: module.MarsResearchCampus };
});

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("GENESIS LOCAL PREVIEW ERROR", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Development-only visual staging; never authorizes production placement. */
export function useGenesisLocalPreview() {
  const [site, setSite] = useState<PreviewSite | null>(null);
  const [doors,setDoors] = useState({surface:false,hub:false,habitat:false});
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    loadAresGenesisTerrainData().then(terrain => {
      const ground = (x:number,z:number) => sampleAresGenesisRenderedSurfaceMeters(terrain, PREVIEW_X+x, PREVIEW_Z+z);
      // Exact V11.2 sampleOfflineSite footprint and half-metre grid.
      let highest=-Infinity;
      for(let x=-15.65;x<=16.15;x+=.5) for(let z=-43.5;z<=35;z+=.5)
        highest=Math.max(highest,ground(Math.min(x,15.65),Math.min(z,34.5)));
      const rootY=highest+.3-1.2;
      const rampEnd=Math.max(...[-2.1,0,2.1].map(x=>ground(x,26)))+.12-rootY;
      if(active)setSite({rootY,surface:(x,z)=>ground(x,z)-rootY,rampEnd});
    }).catch(error=>console.error('GENESIS LOCAL TERRAIN PREVIEW ERROR',error));
    return ()=>{active=false;};
  },[]);
  const walkableSurface=useCallback((_terrain:AresGenesisTerrainData,x:number,z:number)=>{
    if(!site)return null;
    const lx=x-PREVIEW_X,lz=z-PREVIEW_Z;
    const paving=entryHeight(site.surface,lx,lz,1.2);
    if(paving!==null)return paving+site.rootY;
    const interior=genesisInteriorFloorAt(x,z,placement,site.rootY+1.2);
    if(interior!==null)return interior;
    if(Math.abs(lx)<=2.05&&lz>=13.2&&lz<=26)
      return site.rootY+1.2+(site.rampEnd-1.2)*(lz-13.2)/12.8;
    return null;
  },[site]);
  const obstacles=useMemo(()=>{
    if(!site)return [];
    const plan=createV11CampusPlan(site.surface);
    return [...createGenesisCollisionObstacles(placement,doors),
      ...plan.sites.map(s=>({kind:'box' as const,x:PREVIEW_X+s.x,z:PREVIEW_Z+s.z,halfWidth:s.width/2,halfDepth:s.depth/2})),
      ...towers.map(t=>({kind:'box' as const,x:PREVIEW_X+t.x,z:PREVIEW_Z+t.z,halfWidth:1.6,halfDepth:1.6}))];
  },[site,doors]);
  const blockedAt=useCallback((x:number,z:number)=>{
    if(!site)return false;
    const ground=(walkableSurface(null as unknown as AresGenesisTerrainData,x,z)??(site.surface(x-PREVIEW_X,z-PREVIEW_Z)+site.rootY));
    return obstacles.some(o=>{
      const lx=o.x-PREVIEW_X,lz=o.z-PREVIEW_Z;
      if(o.kind==='box'&&Math.abs(Math.abs(lx)-1.95)<1e-6&&Math.abs(lz-19.6)<1e-6){
        const slope=(site.rampEnd-1.2)/12.8;
        let top=site.rootY+1.2+slope*(Math.max(13.2,Math.min(26,z-PREVIEW_Z-.48))-13.2)+.43+.43*Math.hypot(1,slope);
        for(let i=0;i<4;i++){const postZ=14.2+i*10.8/3;if(Math.abs(z-PREVIEW_Z-postZ)<.56)top=Math.max(top,site.rootY+1.2+slope*(postZ-13.2)+.98);}
        if(ground>=top)return false;
      }
      return !!genesisBlockingObstacle(x,z,[o]);
    });
  },[site,obstacles,walkableSurface]);
  const onDoorStateChange=useCallback((id:GenesisDoorId,open:boolean)=>setDoors(d=>d[id]===open?d:{...d,[id]:open}),[]);
  return {site,walkableSurface,obstacles,blockedAt,onDoorStateChange,rockVisible};
}
export function GenesisLocalCampusPreview({targetRef,integration}:{targetRef:RefObject<THREE.Group|null>;integration:ReturnType<typeof useGenesisLocalPreview>}) {
  const {site,onDoorStateChange}=integration;
  const {camera}=useThree();
  const direction=useMemo(()=>new THREE.Vector3(),[]);
  const listenerPoint=useMemo(()=>new THREE.Vector3(),[]);
  const lastAudioFrame=useRef(0);
  const onDoorMotion=useCallback((id:string,open:boolean,position:[number,number,number])=>{
    previewAudio.door?.(id,open,position);
  },[]);
  // BOBU_ARES_RESTORE_V1: Use the real character and previously authored room bounds.
  useFrame(({clock})=>{
    if(!import.meta.env.DEV||!site||!targetRef.current)return;
    if(clock.elapsedTime-lastAudioFrame.current<0.1)return;
    lastAudioFrame.current=clock.elapsedTime;
    const p=targetRef.current.position;
    const lx=p.x-PREVIEW_X, lz=p.z-PREVIEW_Z;
    const insideControl=Math.abs(lx)<8.15&&lz>-9.1&&lz<9.1;
    const insideHabitat=Math.abs(lx)<7.2&&lz>=-43&&lz<=-26;
    const insideVestibule=Math.abs(lx)<1.9&&lz>=9.1&&lz<13.3;
    previewAudio.setMusicInterior?.("genesis-building",insideControl||insideHabitat||insideVestibule);
    camera.getWorldDirection(direction);
    targetRef.current.getWorldPosition(listenerPoint);
    previewAudio.setListener?.(listenerPoint.x,listenerPoint.y+1.5,listenerPoint.z,direction.x,direction.y,direction.z);
    if(Math.abs(lx)<18&&lz>-45&&lz<16){
      aresArrivalSound.setInterior(insideControl||insideHabitat||insideVestibule);
      aresArrivalSound.setCrystalDistance(Math.hypot(lx+13,lz+1));
    }
  });
  useEffect(()=>()=>{
    previewAudio.setMusicInterior?.("genesis-building",false);
    for(const id of ["genesis-surface-airlock","genesis-command-front","genesis-internal-connector","genesis-habitat"])
      previewAudio.stopDoor?.(id);
  },[]);
  if(!import.meta.env.DEV||!site)return null;
  return <PreviewBoundary><Suspense fallback={null}>
    <GreenLandingZone/>
    <GenesisBase position={[PREVIEW_X,site.rootY,PREVIEW_Z]} targetRef={targetRef}
      surfaceAtLocal={site.surface} rampEndLocalY={site.rampEnd} onDoorStateChange={onDoorStateChange} onDoorMotion={onDoorMotion}/>
    <group name="genesis-local-v112-campus" position={[PREVIEW_X,site.rootY,PREVIEW_Z]}>
      <GenesisCampus surface={site.surface}/>
    </group>
  </Suspense></PreviewBoundary>;
}

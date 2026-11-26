import { hasCoarseAresPointer, usesAresMobileVisuals } from "../components/AresRenderQuality";
import { useLoader, useThree } from '@react-three/fiber';
import { CampusGLTFLoader } from './CampusGLTFLoader';
import { markAresStage, startAresStage } from '../engine/aresPerformance';
import { V13FacadeXenonLighting } from './V13FacadeXenonLighting';
import {createCampusExperience,type CameraEnvironment} from './campus-experience';
import {CampusInteriorEffects} from './CampusInteriorEffects';
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { loadAresGenesisTerrainData, sampleAresGenesisRenderedSurfaceMeters, type AresGenesisTerrainData } from '../engine/AresGenesisTerrainData';
import { CampusAssets } from '../../../../imported-v11/core/mars/exploration/genesis-v5/FinalV11CampusAssets';
import { CampusArchitecture } from '../../../../imported-v11/core/mars/exploration/genesis-v5/CampusArchitecture';
import { GreenhouseGarden, Dish } from '../../../../imported-v11/core/mars/exploration/genesis-v5/FinalV11VisualAssets';
import { CONNECTED_CAMPUS_ASSETS } from '../../../../imported-v11/dev/connected-campus-assets';
import { CONNECTED_RELAYS } from '../../../../imported-v11/dev/connected-relays';
import type { WallObstacle } from './mesh-wall-obstacles';
import { CampusFoundation } from './WalkableCampusShell';
import { PremiumCampusLandscape } from './PremiumCampusLandscape';
import { V13EntranceHalls } from './V13EntranceHalls';
import { createCampusTraversal } from './campus-traversal.mjs';
import { createCampusLandscape } from './campus-landscape.mjs';
import { getAresCommandHubFloorY } from '../commandhub/AresCommandHubWalkableSurface';
import type { MarsCollisionObstacle } from '../components/BobuCharacterController';
import { ConnectedCampusArchitecture } from './ConnectedCampusArchitecture';
import { GenesisResearchDisplays } from './GenesisResearchDisplays';
import { GenesisResearchFinish } from './GenesisResearchFinish';

// Local ARES architecture: original greenhouse left, original research dome right
// Individual terrain-fitted foundations; no shared campus platform.
// The production ARES Hub/flight/controller source is never modified here.
export { V11_INDIVIDUAL_BUILDING_ANCHORS, V11_INDIVIDUAL_RELAY_ANCHORS } from './connected-campus-layout.mjs';
import { HUB, V11_INDIVIDUAL_RELAY_ANCHORS, freeFootprint, selectCampusBuildings, type PlannedBuilding } from './connected-campus-layout.mjs';

export function preloadCampusAssets() {
  const finishDispatch = startAresStage("campus-glb-preload-dispatch");
  for (const asset of CONNECTED_CAMPUS_ASSETS) {
    useLoader.preload(CampusGLTFLoader, '/mars/final-v11/campus/' + asset.file);
  }
  useLoader.preload(CampusGLTFLoader, '/mars/final-v11/campus/comms-dish-7b129a.glb');
  finishDispatch?.();
}

function reportCampus(code:string,detail:string):void {
  if (true) {
    window.dispatchEvent(new CustomEvent('bobu:v13-campus-diagnostic',{detail:{code,detail}}));
    console.info('[BOBU V13 CAMPUS]',code,detail);
  }
}
class BuildingBoundary extends Component<{ children: ReactNode; name: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('V11_BUILDING_RENDER_FAILED', this.props.name, error); reportCampus('BUILDING_RENDER_FAILED',this.props.name+': '+error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}

function IndividualBuilding({ building,onHullObstacles,onAssetReady }: {
  building: PlannedBuilding;
  onHullObstacles:(id:string,o:WallObstacle[])=>void;
  onAssetReady:(id:string,ready:boolean)=>void;
}) {
  const reportAssetReady=useCallback(
    (siteId:string,ready:boolean)=>{
      onAssetReady(`${building.id}:${siteId}`,ready);
    },
    [building.id,onAssetReady]
  );
  const hullObstacles=useCallback((o:WallObstacle[])=>onHullObstacles(building.id,o.map(p=>({...p,x:p.x+building.worldX,z:p.z+building.worldZ}))),[building.id,building.worldX,building.worldZ,onHullObstacles]);
  const site = building.plan.sites[0];
  return <group name={'v11-individual-' + building.id} position={[building.worldX, 0, building.worldZ]}>
    <CampusAssets plan={building.plan} traversable onHullObstacles={hullObstacles} onAssetReady={reportAssetReady}/>
    <CampusArchitecture plan={building.plan} traversable />
    {building.id === 'habitat' && <GenesisResearchDisplays site={site} />}
    {building.id === 'habitat' && <GenesisResearchFinish site={site} />}
    {building.id === 'greenhouse' && <GreenhouseGarden deck={site.deck} position={site} />}
  </group>;
}


// BOBU_V13_RELAY_BODY_COLLISIONS: one selected set for rendering and movement.
function selectRelaySites(buildings: PlannedBuilding[]) {
  return (() => {
    const used = buildings.map(b => b.footprint);
    return CONNECTED_RELAYS.slice(0, 3).flatMap((spec, i) => {
      const anchor = V11_INDIVIDUAL_RELAY_ANCHORS[i];
      if (!anchor) return [];
      const footprint = { ...anchor, halfX: 2.5, halfZ: 2.5 };
      if (!freeFootprint(footprint, used)) return [];
      used.push(footprint);
      return [{ ...spec, x: anchor.x, z: anchor.z }];
    });
  })();
}

function IndependentRelays({ terrain, relaySites }: { terrain: AresGenesisTerrainData; relaySites: ReturnType<typeof selectRelaySites> }) {
  const surface = useMemo(() => (x: number, z: number) =>
    sampleAresGenesisRenderedSurfaceMeters(terrain, x, z), [terrain]);
  const target = useMemo(() => [HUB.x + 12, surface(HUB.x, HUB.z) + 28, HUB.z - 20] as const, [surface]);
  return <group name="v11-individual-relays">
    {relaySites.map(spec => <BuildingBoundary key={spec.id} name={spec.id}>
      <Suspense fallback={null}><Dish spec={spec} surface={surface} target={target} mobileVisuals={usesAresMobileVisuals()} /></Suspense>
    </BuildingBoundary>)}
  </group>;
}

// Keep the existing public component API: the current opt-in, on-foot ARES
// bridge mounts SeparateV11Campus; no ARES files or controls need editing.
export type CampusRuntime={checkpointGeometryReady:boolean;interiorAt:(x:number,z:number)=>boolean;cameraEnvironmentAt:(x:number,z:number)=>CameraEnvironment|null;obstacles:MarsCollisionObstacle[];walkableSurface:(terrain:AresGenesisTerrainData,x:number,z:number)=>number|null};
export function SeparateV11Campus({
  targetRef, onRuntime, parkedShip, flightMode = false,
}: {
  targetRef?: RefObject<THREE.Group | null>;
  onRuntime?: (runtime:CampusRuntime|null)=>void;
  parkedShip?: [number, number, number] | null;
  flightMode?: boolean;
}) {
  // BOBU_V13_PER_BUILDING_HULL_AGGREGATION_V1
  // Each building owns its wall obstacles; async GLB loads must not erase a neighbour's walls.
  const [hullsByBuilding,setHullsByBuilding]=useState<Record<string,WallObstacle[]>>({});

  const [readyAssets,setReadyAssets]=useState<Record<string,boolean>>({});

  const updateAssetReady=useCallback(
    (id:string,ready:boolean)=>{
      setReadyAssets(previous=>{
        if(previous[id]===ready)return previous;
        return {...previous,[id]:ready};
      });
    },
    []
  );
  const updateBuildingHulls=useCallback((id:string,walls:WallObstacle[])=>{
    setHullsByBuilding(previous=>{
      const old=previous[id];
      if(old&&JSON.stringify(old)===JSON.stringify(walls)) return previous;
      return {...previous,[id]:walls};
    });
  },[]);
  const hullObstacles=useMemo(()=>Object.values(hullsByBuilding).flat(),[hullsByBuilding]);
  const [mobile] = useState(hasCoarseAresPointer);
  const scene = useThree(state => state.scene);
  const [surface, setSurface] = useState<{
    terrain: AresGenesisTerrainData;
    parkedShip?: [number, number, number];
  } | null>(null);
  const terrain = surface?.terrain ?? null;
  useEffect(() => {
    markAresStage('campus-mounted');
    let alive = true;
    loadAresGenesisTerrainData().then(data => {
      if (alive) {
        markAresStage('campus-terrain-ready');
        reportCampus('TERRAIN_READY', `${data.width}x${data.height}`);
        // The parked craft commits with handoff, before the terrain promise
        // resolves. Capture its location before generating any landscaping.
        const craft = scene.getObjectByName('BOBU-Ares-landed-spacecraft');
        setSurface({
          terrain: data,
          parkedShip: craft?.getWorldPosition(new THREE.Vector3()).toArray(),
        });
      }
    })
      .catch(error => { console.error('V11_TERRAIN_LOAD_FAILED', error); reportCampus('TERRAIN_LOAD_FAILED',String(error)); });
    return () => { alive = false; markAresStage('campus-unmounted'); };
  }, [scene]);
  const buildings = useMemo(() => terrain ? selectCampusBuildings(CONNECTED_CAMPUS_ASSETS, (x, z) => sampleAresGenesisRenderedSurfaceMeters(terrain, x, z)) : [], [terrain]);
  useEffect(() => {
    if (!terrain) return;
    const names=buildings.map(b=>`${b.id}@(${b.worldX},${b.worldZ})`).join(' | ');
    reportCampus(buildings.length ? 'BUILDINGS_PLANNED' : 'NO_SAFE_BUILDINGS',
      `${buildings.length}/${CONNECTED_CAMPUS_ASSETS.length} buildings: ${names || 'no safe placements'}`);
  }, [terrain, buildings]);
  const checkpointGeometryReady = useMemo(
    () =>
      terrain !== null &&
      buildings.length > 0 &&
      buildings.every(building =>
        building.plan.sites.length > 0 &&
        building.plan.sites.every(site =>
          readyAssets[`${building.id}:${site.id}`] === true
        ) &&
        (
          !building.plan.sites.some(site => site.id === 'habitat') ||
          (
            Array.isArray(hullsByBuilding[building.id]) &&
            hullsByBuilding[building.id].length > 0
          )
        )
      ),
    [terrain, buildings, readyAssets, hullsByBuilding]
  );

  const relaySites=useMemo(()=>terrain?selectRelaySites(buildings):[],[terrain,buildings]);
  // Restrict movement around actual relay bodies, not their beams.
  // Radius matches the relay selection footprint (2.5m); preserve walking between towers.
  const relayBodyObstacles=useMemo<MarsCollisionObstacle[]>(()=>relaySites.map(spec=>({x:spec.x,z:spec.z,radius:2.5})),[relaySites]);
  const terrainAt=useMemo(()=>terrain?(x:number,z:number)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z):null,[terrain]);
  const model=useMemo(()=>terrain&&terrainAt?createCampusTraversal(buildings,terrainAt,getAresCommandHubFloorY(terrain)):null,[terrain,terrainAt,buildings]);
  const experience=useMemo(()=>model&&terrain?createCampusExperience(model,buildings,getAresCommandHubFloorY(terrain)):null,[model,buildings,terrain]);
  const landscape=useMemo(()=>terrainAt?createCampusLandscape(buildings,terrainAt):null,[terrainAt,buildings]);
  useEffect(()=>{
    if(!model||!landscape||!experience){onRuntime?.(null);return;}
    markAresStage('campus-runtime-ready');
    onRuntime?.({checkpointGeometryReady,interiorAt:experience.interiorAt,cameraEnvironmentAt:experience.environmentAt,obstacles:[...model.obstacles,...landscape.obstacles,...hullObstacles,...relayBodyObstacles],walkableSurface:(_terrain,x,z)=>model.walkable(x,z)??landscape.floor(x,z)});
    return()=>onRuntime?.(null);
  },[model,landscape,hullObstacles,relayBodyObstacles,experience,onRuntime,checkpointGeometryReady]);
  if (!terrain) return null;
  return <group name="v11-independent-buildings-no-common-platform">
    {buildings.map(building => <BuildingBoundary key={building.id} name={building.id}>
      <Suspense fallback={null}><IndividualBuilding building={building} onHullObstacles={updateBuildingHulls} onAssetReady={updateAssetReady}/></Suspense>
    </BuildingBoundary>)}
    {experience&&<CampusInteriorEffects experience={experience} targetRef={targetRef}/>}
    <ConnectedCampusArchitecture terrain={terrain} buildings={buildings} model={model}/>
    {terrainAt && <V13EntranceHalls terrainAt={terrainAt} buildings={buildings} mobile={mobile}/>}

    {terrainAt&&buildings.filter(b=>b.id==='habitat').map(building=><CampusFoundation key={building.id} building={building} terrainAt={terrainAt}/>)}
    {terrainAt && landscape && <PremiumCampusLandscape
      plan={landscape}
      terrainAt={terrainAt}
      greenhouse={buildings.find(building => building.id === 'greenhouse')}
      genesis={buildings.find(building => building.id === 'habitat')}
      parkedShip={
        parkedShip === undefined
          ? surface?.parkedShip
          : parkedShip ?? undefined
      }
      mobile={mobile || flightMode}
    />}
    {terrainAt && <V13FacadeXenonLighting terrainAt={terrainAt} buildings={buildings} mobile={mobile} />}
    <IndependentRelays terrain={terrain} relaySites={relaySites} />
  </group>;
}

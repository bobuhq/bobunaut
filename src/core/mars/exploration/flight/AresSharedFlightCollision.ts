import { supabase } from '../../../../lib/supabase';
import { aresColonyGridToWorld, ARES_COLONY_GRID_UNIT_METERS } from '../colony/AresColonyCoordinateSystem';
import { ARES_COMMAND_HUB_POSITION, ARES_COMMAND_HUB_WIDTH, ARES_COMMAND_HUB_DEPTH } from '../commandhub/AresCommandHubCollision';
import { MARS_SURFACE_ROCK_COLLISION_OBSTACLES } from '../components/MarsSurfaceRocks';

type FlightArea = { id: string; kind: 'box' | 'circle'; x: number; z: number; halfWidth?: number; halfDepth?: number; radius?: number; groundOnly?: boolean; rotationY?: number };
export type SharedFlightCollision = { buildings: FlightArea[]; fixed: FlightArea[]; legalRegions: FlightArea[] };

const validNumber = (n: unknown): n is number => typeof n==='number' && Number.isFinite(n);
const record = (n: unknown): n is Record<string,unknown> => n!==null && typeof n==='object' && !Array.isArray(n);

/** Authenticated, server-derived cross-colony geometry; no user-supplied owner or colony id. */
export async function readAresSharedFlightCollision(): Promise<SharedFlightCollision> {
  const {data,error}=await supabase.rpc('get_ares_shared_flight_collision_v1');
  if(error) throw new Error('Shared ARES flight collision RPC unavailable');
  if(!record(data)||data.status!=='ready'||!Array.isArray(data.buildings)||!Array.isArray(data.legalRegions))
    throw new Error('Incomplete shared ARES flight collision snapshot');
  const used=new Set<string>();
  const buildings:FlightArea[]=data.buildings.map((entry:unknown)=>{
    if(!record(entry)||typeof entry.id!=='string'||!entry.id||used.has(entry.id)||
       typeof entry.buildingKey!=='string'||
       !Number.isInteger(entry.gridX)||!Number.isInteger(entry.gridZ)||
       !Number.isInteger(entry.width)||!Number.isInteger(entry.depth)||
       !validNumber(entry.width)||!validNumber(entry.depth)||
       entry.width<1||entry.width>8||entry.depth<1||entry.depth>8||
       ![0,90,180,270].includes(entry.rotationY as number))
      throw new Error('Invalid shared ARES building geometry');
    used.add(entry.id);
    const point=aresColonyGridToWorld(entry.gridX as number,entry.gridZ as number,entry.width,entry.depth);
    return {id:entry.id,kind:'box',...point,halfWidth:entry.width*ARES_COLONY_GRID_UNIT_METERS/2+.6,
      halfDepth:entry.depth*ARES_COLONY_GRID_UNIT_METERS/2+.6,rotationY:entry.rotationY as number};
  });
  const legalRegions:FlightArea[]=data.legalRegions.map((entry:unknown,index:number)=>{
    if(!record(entry)||!Number.isInteger(entry.mapMin)||!Number.isInteger(entry.mapMax)||
       !validNumber(entry.mapMin)||!validNumber(entry.mapMax)||entry.mapMax<entry.mapMin||
       entry.mapMax-entry.mapMin>1000)throw new Error('Invalid shared ARES legal region');
    const cells=entry.mapMax-entry.mapMin+1;
    const center=aresColonyGridToWorld(entry.mapMin,entry.mapMin,cells,cells);
    return {kind:'box',id:`shared-legal-region-${index}`,...center,
      halfWidth:cells*ARES_COLONY_GRID_UNIT_METERS/2,halfDepth:cells*ARES_COLONY_GRID_UNIT_METERS/2,groundOnly:true};
  });
  if(data.legalRegions.length===0 && data.buildings.length>0)throw new Error('Shared ARES regions missing');
  const fixed:FlightArea[]=[
    {id:'original-command-hub-visual',kind:'box',...ARES_COMMAND_HUB_POSITION,
      halfWidth:ARES_COMMAND_HUB_WIDTH/2+.6,halfDepth:ARES_COMMAND_HUB_DEPTH/2+.6},
    ...MARS_SURFACE_ROCK_COLLISION_OBSTACLES.map((o,i)=>({...o,id:`surface-rock-${i}`,
      kind:'circle' as const,radius:o.radius+.6})),
    {id:'existing-fixed-beacon',kind:'circle',x:18,z:-28,radius:1.95}
  ];
  return {buildings,fixed,legalRegions};
}

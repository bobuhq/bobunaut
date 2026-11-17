import release from '../../genesis-release.json';
import {validateGenesisCertificate} from './certification.mjs';
import { supabase } from '../../../../lib/supabase';
import {getMarsCommandHubProgressionForColony} from '../../MarsCommandHubProgressionService';
import {getMyMarsColonyBase} from '../../MarsColonyBaseService';
import {aresColonyGridToWorld, ARES_COLONY_GRID_UNIT_METERS} from '../colony/AresColonyCoordinateSystem';
import {ARES_COMMAND_HUB_POSITION, ARES_COMMAND_HUB_WIDTH, ARES_COMMAND_HUB_DEPTH} from '../commandhub/AresCommandHubCollision';
import {MARS_SURFACE_ROCK_COLLISION_OBSTACLES} from '../components/MarsSurfaceRocks';
import {buildingOccupancy, overlappingReservations, OCCUPANCY_BLOCKERS, blockedPlacementReview, type Area} from './colony-occupancy.mjs';

/** Read-only diagnostic adapter. No caller-supplied colony ID, auth override or writes.
 * observedAt is a local read time, NOT a server freshness guarantee.
 * Current RPC cannot certify live safety, even when every returned row is valid. */
export async function readAresColonyOccupancy() {
 const observedAt=Date.now();
 try {
  const rows=await getMyMarsColonyBase();
  const {colonyId,boxes}=buildingOccupancy(rows,aresColonyGridToWorld,ARES_COLONY_GRID_UNIT_METERS);
  const progression=await getMarsCommandHubProgressionForColony(colonyId);
  if(![progression.map_min,progression.map_max,progression.command_hub_level].every(Number.isInteger)||progression.map_min>progression.map_max||progression.command_hub_level<1)throw Error('Invalid legal building territory');
  const cells=progression.map_max-progression.map_min+1;
  const center=aresColonyGridToWorld(progression.map_min,progression.map_min,cells,cells);
  const legalBuildingRegion={kind:'box' as const,id:'progression-building-grid',...center,halfWidth:cells*ARES_COLONY_GRID_UNIT_METERS/2,halfDepth:cells*ARES_COLONY_GRID_UNIT_METERS/2};
  const fixed:Area[]=[{id:'original-command-hub-visual',kind:'box',...ARES_COMMAND_HUB_POSITION,halfWidth:ARES_COMMAND_HUB_WIDTH/2+.6,halfDepth:ARES_COMMAND_HUB_DEPTH/2+.6},
   ...MARS_SURFACE_ROCK_COLLISION_OBSTACLES.map((o,i)=>({...o,id:`surface-rock-${i}`,kind:'circle' as const,radius:o.radius+.6})),
   {id:'existing-fixed-beacon',kind:'circle' as const,x:18,z:-28,radius:1.95}];
  return {status:'blocked' as const,observedAt,colonyId,buildings:boxes,fixed,progression,legalBuildingRegion,protectedRoutes:null,legalRegions:null,authoritativeRevision:null,reservation:null,
   // Replacement intent concerns only the fixed standalone visual. The colony building
   // record remains occupied and owned; its footprint grants no campus entitlement.
   replacementIntent:{visualId:'original-command-hub-visual',preserveBuildingRecord:true,requiresFullCampusReservation:true},
   overlaps:overlappingReservations([...boxes,...fixed]),blockers:[...OCCUPANCY_BLOCKERS]};
 }catch(error){
  return {status:'blocked' as const,observedAt,colonyId:null,progression:null,legalBuildingRegion:null,buildings:[],fixed:[],protectedRoutes:null,legalRegions:null,authoritativeRevision:null,reservation:null,overlaps:[],blockers:['Colony occupancy read rejected: '+(error instanceof Error?error.message:String(error)),...OCCUPANCY_BLOCKERS]};
 }
}

/** Server-only placement authorization. Browser geometry never grants permission.
 * An absent API, invalid JWT, missing certificate or expired lease fails closed. */
export async function reviewAresGenesisPlacement() {
 const occupancy = await readAresColonyOccupancy();
 if (!occupancy.colonyId) return {...blockedPlacementReview(occupancy),occupancy};
 try {
  const {data,error} = await supabase.rpc('get_ares_genesis_placement_v10');
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) throw Error(error?.message || 'Approval API unavailable');
  const result = data as Record<string,unknown>;
  if (result.status !== 'approved' || typeof result.revision !== 'string' || !result.revision) throw Error(String(result.reason || 'Placement not approved'));
  const expiresAt = typeof result.expires_at === 'string' ? Date.parse(result.expires_at) : NaN;
  // Do not rely on future-dated unbounded approvals, browser time or an unspecified lease.
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() + 30000 || expiresAt > Date.now() + 86400000) throw Error('Approval expired or invalid');
  const site = result.site;
  if (!site || typeof site !== 'object' || Array.isArray(site)) throw Error('Missing server site');
  const v = site as Record<string,unknown>;
  const p = v.placement;
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw Error('Missing placement');
  const place = p as Record<string,unknown>;
  if (place.x !== -44 || place.z !== -68 || place.rotationY !== 0) throw Error('Unrecognized Genesis footprint');
  if (v.occupancyComplete !== true || v.routesReserved !== true || v.placementReserved !== true) throw Error('Incomplete certification');
  for (const list of ['occupied','protectedRoutes','reservedCells','legalRegions']) if (!Array.isArray(v[list])) throw Error('Missing certified geometry: '+list);
  validateGenesisCertificate(result,{colonyId:occupancy.colonyId,releaseDigest:release.sha256});
  return {status:'approved' as const,revision:result.revision,expiresAt,site:v,occupancy};
 } catch (error) {
  return {...blockedPlacementReview(occupancy), occupancy,
   blockers:['SERVER_APPROVAL_BLOCKED: '+(error instanceof Error?error.message:String(error)),...OCCUPANCY_BLOCKERS]};
 }
}

/** Pure geometry only. RPC footprints are EFFECTIVE dimensions, already rotated. */
export function buildingOccupancy(rows, gridToWorld, unit, clearance = .6) {
 if (!Array.isArray(rows) || !rows.length || !Number.isFinite(unit) || unit <= 0 || !Number.isFinite(clearance) || clearance < .6) throw Error('Incomplete colony occupancy');
 const colonyId=rows[0]?.colony_id;
 if(typeof colonyId!=='string'||!colonyId)throw Error('Missing authenticated colony');
 const ids=new Set(), boxes=[];
 for(const row of rows){
  if(row.colony_id!==colonyId || typeof row.built!=='boolean')throw Error('Inconsistent colony read');
  if(!row.built){if(row.building_id!==null)throw Error('Ambiguous physical instance');continue;}
  if(typeof row.building_id!=='string'||!row.building_id||ids.has(row.building_id)||typeof row.building_key!=='string'||!row.building_key||row.building_status==='archived')throw Error('Invalid physical instance');
  ids.add(row.building_id);
  if(![row.grid_x,row.grid_z].every(Number.isInteger)||![row.footprint_width,row.footprint_depth].every(v=>Number.isInteger(v)&&v>=1&&v<=8)||![0,90,180,270].includes(row.rotation_y))throw Error('Missing or invalid placement');
  const p=gridToWorld(row.grid_x,row.grid_z,row.footprint_width,row.footprint_depth);
  if(!p||![p.x,p.z].every(Number.isFinite))throw Error('Invalid world conversion');
  boxes.push({id:row.building_id,buildingKey:row.building_key,kind:'box',...p,halfWidth:row.footprint_width*unit/2+clearance,halfDepth:row.footprint_depth*unit/2+clearance,rotationY:row.rotation_y});
 }
 if(boxes.filter(b=>b.buildingKey==='command_hub').length!==1)throw Error('Original Command Hub identity unavailable');
 return {colonyId,boxes};
}
export function areasOverlap(a,b){
 for(const o of [a,b])if(!o||![o.x,o.z].every(Number.isFinite)||(o.kind==='box'?![o.halfWidth,o.halfDepth].every(v=>Number.isFinite(v)&&v>0):o.kind!=='circle'||!Number.isFinite(o.radius)||o.radius<=0))throw Error('Invalid reserved area');
 if(a.kind==='circle'&&b.kind==='box')return areasOverlap(b,a);
 if(a.kind==='circle')return Math.hypot(a.x-b.x,a.z-b.z)<=a.radius+b.radius;
 const dx=Math.max(Math.abs(a.x-b.x)-a.halfWidth-(b.kind==='box'?b.halfWidth:0),0),dz=Math.max(Math.abs(a.z-b.z)-a.halfDepth-(b.kind==='box'?b.halfDepth:0),0);
 return b.kind==='box'?dx===0&&dz===0:Math.hypot(dx,dz)<=b.radius;
}
export function overlappingReservations(areas){
 const conflicts=[];
 for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++)if(areasOverlap(areas[i],areas[j]))conflicts.push([areas[i].id,areas[j].id]);
 return conflicts;
}
export const OCCUPANCY_BLOCKERS=Object.freeze([
 'RPC has no authoritative revision, expiry or atomic occupancy snapshot',
 'No complete cross-colony occupancy or shared-world scope contract',
 'No authoritative protected walking/entrance routes or complete fixed-obstacle registry',
 'Progression grid exists, but no campus entitlement or exploration-region reservation contract',
 'No atomic campus reservation, conflict revalidation, renewal or release lifecycle',
]);
/** Never infer completeness from a successful RPC or a local wall clock. */
export function blockedPlacementReview(snapshot, now=Date.now()){
 const blockers=[...OCCUPANCY_BLOCKERS];
 if(!snapshot||snapshot.status!=='blocked'||!Number.isFinite(snapshot.observedAt)||now<snapshot.observedAt||now-snapshot.observedAt>15000)blockers.unshift('Occupancy unavailable or locally stale');
 return {status:'blocked',safeCandidates:[],blockers};
}

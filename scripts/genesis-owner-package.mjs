import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {collectGenesisSourceEvidence} from './genesis-source-evidence.mjs';
import {genesisLocalToWorld,GENESIS_LOCAL_DOORS} from '../src/core/mars/exploration/genesis-v5/3d/production-collision-adapter.mjs';
// This recovers authored extents. It cannot infer an external route from a bearing.
export function buildOwnerPackage(){
 const recovered=collectGenesisSourceEvidence({includeGeometry:true}),{sourceGeometry,...source}=recovered,placement={x:-516,z:-213,rotationY:0};
 const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
 const routeSource='src/core/mars/exploration/commandhub/AresCommandHubWalkableSurface.ts';
 const stairs=sourceGeometry.hubWalkable,hubX=sourceGeometry.fixed.find(o=>o.id==='original-command-hub-visual').x;
 const origin=sourceGeometry.colonyMapping.aresColonyGridToWorld(0,0,1,1);
 const body={schema:'bobu.genesis.v11.owner-review.v1',status:'incomplete',owner:'BOBU',externalAuthorityRequired:false,
  archive:{commit:'d884aae87722d9c6a8212d0a97f983bf2a6df1aa',sha256:'0e44930390b45be52f77c5e1d2419bb4c5963618cf997cf47d0dd54725c9c2f3'},
  placement,allocation:{kind:'box',x:-530.5,z:-210.5,halfWidth:54.7,halfDepth:67.7,xMin:-585.2,xMax:-475.8,zMin:-278.2,zMax:-142.8},
  mapping:{origin_x:origin.x,origin_z:origin.z,scale:sourceGeometry.colonyMapping.ARES_COLONY_GRID_UNIT_METERS,yaw:0,contract:'world center = origin + (grid + (effective footprint - 1)/2) * scale; rotate footprint dimensions once',source:'src/core/mars/exploration/colony/AresColonyCoordinateSystem.ts'},
  terrain:{source:'src/core/mars/exploration/engine/AresGenesisTerrainData.ts',heightSha256:digest('public/mars/ares-genesis/ares-genesis-height-16.bin'),safeBoundaryMeters:6350,visualVerticalScale:3},
  geometry:source,
  entrances:GENESIS_LOCAL_DOORS.map(d=>({id:d.id,world:genesisLocalToWorld(0,d.z,placement),halfWidth:d.halfWidth,halfDepth:d.halfDepth})),
  campusRamp:{worldStart:genesisLocalToWorld(0,13.2,placement),worldEnd:genesisLocalToWorld(0,26,placement),walkableHalfWidth:2.05,scope:'inside campus allocation; excluded from external blocker list'},
  protected_routes_v5:[{sector_code:'ARES',route_key:'command-hub-existing-stairs',route_kind:'entrance',bounds:{xMin:hubX-stairs.ARES_COMMAND_HUB_STAIR_WIDTH/2,xMax:hubX+stairs.ARES_COMMAND_HUB_STAIR_WIDTH/2,zMin:stairs.ARES_COMMAND_HUB_FRONT_Z,zMax:stairs.ARES_COMMAND_HUB_FRONT_Z+stairs.ARES_COMMAND_HUB_STAIR_DEPTH},source:routeSource,source_digest:digest(routeSource),status:'pending',scope:'authored stair area only; does not establish connecting corridor'}],
  requiredOwnerDecisions:['Approve allocation for the existing colony, without changing progression/building ownership','Confirm coordinate mapping and full world coverage','Supply or explicitly approve complete external walking, landing-access, service, emergency and mission-access corridors with exact bounds and source/provenance','Confirm full landmark structure extents beyond the 4m survey radius; survey radius alone is insufficient','Enroll the genuine authenticated BOBU owner identity through the database operator'],
  blockers:['External corridor extents are not present in source; no complete route inventory can be recovered','Landing search is dynamic; local artistic green zone is not a production landing entitlement','Fresh complete production occupancy and protected-landmark inventory must be attached before issuance','Authenticated owner approval, archived verification evidence and genuine player-session live test remain required']};
 return {...body,packageSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')};
}
if(process.argv[1]?.endsWith('/genesis-owner-package.mjs')){
 const path='docs/genesis-v11-owner-package.json',out=JSON.stringify(buildOwnerPackage(),null,2)+'\n';
 if(process.argv.includes('--write'))writeFileSync(path,out);else if(readFileSync(path,'utf8')!==out)throw Error('Owner review package is stale');
 console.log('OWNER_PACKAGE_RECOVERED: incomplete; no approval or production mutation');
}

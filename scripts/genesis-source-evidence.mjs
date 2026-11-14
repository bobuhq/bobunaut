import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {buildSync} from 'esbuild';
import {areasOverlap} from '../src/core/mars/exploration/genesis-v5/colony-occupancy.mjs';
import {v11WorldFootprint} from '../src/core/mars/exploration/genesis-v5/v11-footprint.mjs';
import {prepareIntegratedCampus,HUB_PLACEMENT,INTEGRATED_LAYOUT,integratedReservations} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
const sources={
 terrain:'src/core/mars/exploration/engine/AresGenesisTerrainData.ts',
 height:'public/mars/ares-genesis/ares-genesis-height-16.bin',
 rocks:'src/core/mars/exploration/components/MarsSurfaceRocks.tsx',
 hub:'src/core/mars/exploration/commandhub/AresCommandHubCollision.ts',
 hubWalkable:'src/core/mars/exploration/commandhub/AresCommandHubWalkableSurface.ts',
 colonyMapping:'src/core/mars/exploration/colony/AresColonyCoordinateSystem.ts',
 landmarks:'src/core/mars/exploration/landmarks/AresExplorationLandmarks.tsx',
 landmarkCatalog:'supabase/migrations/20260830170000_create_ares_landmark_discovery_v1.sql',
 world:'src/core/mars/exploration/MarsExploreWorld.tsx',
 missionCatalog:'supabase/migrations/20260830005000_create_ares_hidden_mission_engine_v1.sql',
 guidance:'src/core/mars/exploration/guidance/AresGuidanceSystem.tsx',
};
export function collectGenesisSourceEvidence({includeGeometry=false}={}){
 const observed=JSON.parse(readFileSync('docs/genesis-v11-integrated-live-geometry.json','utf8'));
 const observedBuildings=observed.buildings.map(b=>{const swap=[90,270].includes(b.rotation_y),w=swap?b.depth:b.width,d=swap?b.width:b.depth;return {id:b.id,kind:'box',x:-50.75+(b.grid_x+(w-1)/2)*4.5,z:-74.75+(b.grid_z+(d-1)/2)*4.5,halfWidth:w*2.25+.6,halfDepth:d*2.25+.6};});
 const dir=mkdtempSync(join(tmpdir(),'bobu-source-evidence-'));
 try{
  const modules={};
  for(const key of ['terrain','rocks','hub','hubWalkable','colonyMapping']){
   const file=join(dir,key+'.cjs');
   buildSync({entryPoints:[sources[key]],outfile:file,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
   modules[key]=createRequire(import.meta.url)(file);
  }
  const text=readFileSync(sources.landmarks,'utf8');
  const ast=ts.createSourceFile(sources.landmarks,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let literal,surveyDistance;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='LANDMARKS')literal=node.initializer.getText(ast);if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='SURVEY_DISTANCE')surveyDistance=Number(node.initializer.getText(ast));ts.forEachChild(node,visit);}
  visit(ast);if(!literal)throw Error('Landmark source declaration unavailable');
  const landmarks=JSON.parse(JSON.stringify(vm.runInNewContext('('+literal+')',{}, {timeout:1000})));
  if(!Number.isFinite(surveyDistance))throw Error('Landmark survey distance unavailable');
  const worldAst=ts.createSourceFile(sources.world,readFileSync(sources.world,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const worldPoints=[];
  function readWorld(node){
   if(ts.isJsxAttribute(node)&&node.name.getText(worldAst)==='collisionObstacles'){
    function point(n){
     if(ts.isObjectLiteralExpression(n)){
      const value={};
      for(const p of n.properties)if(ts.isPropertyAssignment(p)&&['x','z','radius'].includes(p.name.getText(worldAst)))value[p.name.getText(worldAst)]=Number(p.initializer.getText(worldAst));
      if(['x','z','radius'].every(k=>Number.isFinite(value[k])))worldPoints.push({...value,kind:'circle',id:'host-fixed-point-'+worldPoints.length});
     }
     ts.forEachChild(n,point);
    }
    point(node);
   }
   ts.forEachChild(node,readWorld);
  }
  readWorld(worldAst);
  if(!worldPoints.length)throw Error('Host fixed collision declarations unavailable');
  const placement=HUB_PLACEMENT,reservations=integratedReservations();
  const rocks=modules.rocks.MARS_SURFACE_ROCK_COLLISION_OBSTACLES.map((o,i)=>({...o,kind:'circle',id:'surface-rock-'+i}));
  const hub={...modules.hub.ARES_COMMAND_HUB_POSITION,kind:'box',id:'original-command-hub-visual',halfWidth:modules.hub.ARES_COMMAND_HUB_WIDTH/2+.6,halfDepth:modules.hub.ARES_COMMAND_HUB_DEPTH/2+.6};
  const fixed=[...rocks,hub,...worldPoints];
  const bytes=readFileSync(sources.height),m=modules.terrain;
  if(bytes.length!==m.ARES_GENESIS_HEIGHT_WIDTH*m.ARES_GENESIS_HEIGHT_HEIGHT*2)throw Error('Invalid height asset');
  const terrain={width:m.ARES_GENESIS_HEIGHT_WIDTH,height:m.ARES_GENESIS_HEIGHT_HEIGHT,elevations:Float32Array.from({length:bytes.length/2},(_,i)=>m.ARES_GENESIS_MIN_ELEVATION_METERS+bytes.readUInt16LE(i*2)/65535*(m.ARES_GENESIS_MAX_ELEVATION_METERS-m.ARES_GENESIS_MIN_ELEVATION_METERS))};
  // Deliberately local geometry-only fixture. No completeness/entitlement claim
  // is exported, and no live approval endpoint is contacted.
  const site=prepareIntegratedCampus({layout:INTEGRATED_LAYOUT,reservations,placement,sample:(x,z)=>m.sampleAresGenesisRenderedSurfaceMeters(terrain,x,z),occupied:[...fixed,...observedBuildings,...observed.missions],occupancyComplete:true,routesReserved:true,placementReserved:true,protectedRoutes:[],reservedCells:[],legalRegions:reservations});
  return {
   schema:1,scope:'repository geometry only; not production certification',productionCertified:false,
   ...(includeGeometry?{sourceGeometry:{fixed,observedBuildings,observedMissions:observed.missions,hubWalkable:modules.hubWalkable,colonyMapping:modules.colonyMapping,sample:(x,z)=>m.sampleAresGenesisRenderedSurfaceMeters(terrain,x,z)}}:{}),
   releaseDigest:JSON.parse(readFileSync('src/core/mars/genesis-release.json','utf8')).sha256,
   sourceDigests:Object.fromEntries(Object.values(sources).map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
   layout:INTEGRATED_LAYOUT,placement,reservations,knownFixedObstacleCount:fixed.length,knownFixedConflicts:fixed.filter(o=>reservations.some(a=>areasOverlap(a,o))).map(o=>o.id),
   landmarks:landmarks.map(l=>({...l,surveyRadius:surveyDistance,campusOverlapsSurveyPoint:reservations.some(a=>areasOverlap(a,{kind:'circle',x:l.x,z:l.z,radius:surveyDistance}))})),
   observedProductionGeometry:{source:'docs/genesis-v11-integrated-live-geometry.json',sha256:createHash('sha256').update(readFileSync('docs/genesis-v11-integrated-live-geometry.json')).digest('hex'),buildingCount:observedBuildings.length,missionCount:observed.missions.length,conflicts:[...observedBuildings,...observed.missions].filter(o=>reservations.some(a=>areasOverlap(a,o))).map(o=>o.id)},
   terrainGeometry:{passed:true,rootY:site.rootY,sites:site.plan.sites.map(s=>({id:s.id,x:s.x-44,z:s.z-68,relief:s.max-s.min,slope:s.slope,deck:s.deck}))},
   missingAuthority:['current production world/colony snapshot','approved complete external walking/entrance route and dynamic mission inventory','legal campus entitlement','trusted reviewer evidence archive and service-issued certificate for this release','production/staging schema, lease and device validation'],
  };
 }finally{rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]?.endsWith('/genesis-source-evidence.mjs')){
 const output=JSON.stringify(collectGenesisSourceEvidence(),null,2)+'\n';
 const path='docs/genesis-v11-source-evidence.json';
 if(process.argv.includes('--write'))writeFileSync(path,output);
 else if(readFileSync(path,'utf8')!==output)throw Error('Repository source evidence is stale; regenerate it without claiming production authority');
 console.log('GENESIS_SOURCE_GEOMETRY_CHECK_PASS (production certification: false)');
}

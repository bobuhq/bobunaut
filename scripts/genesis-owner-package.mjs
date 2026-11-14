import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {collectGenesisSourceEvidence} from './genesis-source-evidence.mjs';
import {HUB_PLACEMENT,INTEGRATED_LAYOUT,integratedReservations} from '../src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
export function buildOwnerPackage(){
 const source=collectGenesisSourceEvidence();
 const body={schema:'bobu.genesis.v11.integrated-owner-review.v1',status:'incomplete',owner:'BOBU',externalAuthorityRequired:false,
 layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,allocation:integratedReservations(),geometry:source,
 mapping:{origin_x:-50.75,origin_z:-74.75,scale:4.5,yaw:0},
 preservedCenter:{x:-44,z:-68,kind:'existing-command-hub',newBuilding:false},
 protected_routes_v5:[{sector_code:'ARES',route_key:'command-hub-existing-stairs',route_kind:'entrance',bounds:{xMin:-45.8,xMax:-42.2,zMin:-59,zMax:-57.2},source:'src/core/mars/exploration/commandhub/AresCommandHubWalkableSurface.ts',status:'pending'}],
 requiredOwnerDecisions:['Approve only the disjoint integrated addition reservations around the existing Hub','Review complete external route and landmark extents against a fresh global server snapshot','Approve a new integrated-layout proposal and evidence archive; the distant allocation is obsolete'],
 blockers:['Complete external route and landmark extent authority remains absent','Fresh production world evidence, owner decision and new certificate are required','Staging and authenticated live browser validation are required before deployment']};
 return {...body,packageSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')};
}
if(process.argv[1]?.endsWith('/genesis-owner-package.mjs')){const path='docs/genesis-v11-owner-package.json',out=JSON.stringify(buildOwnerPackage(),null,2)+'\n';if(process.argv.includes('--write'))writeFileSync(path,out);else if(readFileSync(path,'utf8')!==out)throw Error('Owner review package is stale');console.log('INTEGRATED_OWNER_PACKAGE: incomplete; no production authority');}

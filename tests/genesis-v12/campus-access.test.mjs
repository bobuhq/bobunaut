import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConnectedCampusLayout,HUB_ENVELOPE,CONNECTOR_WIDTH} from '../../src/core/mars/exploration/separate-v11/connected-campus-layout.mjs';
import {buildings,terrainAt,hubFloor} from './campus-fixture.mjs';
const b=buildings.find(b=>b.id==='habitat');
const research={x:b.worldX,z:b.worldZ,deck:b.plan.sites[0].deck,halfX:b.footprint.halfX,halfZ:b.footprint.halfZ};
const links=createConnectedCampusLayout({hubFloor,research,terrainAt});
test('enclosed front bridge overlaps both original Hub exterior and Genesis foundation',()=>{
 const link=links.find(l=>l.id==='hub-genesis-enclosed-link');
 assert.ok(link.a[0]<HUB_ENVELOPE.xMax,'Hub end penetrates facade to remove seam');
 assert.ok(link.b[0]>research.x-research.halfX,'research end penetrates facade');
 assert.equal(link.a[1],hubFloor);assert.equal(link.b[1],research.deck+.2);
 assert.ok(link.length<15,'compact direct link, without a distant platform');
 assert.ok(Math.abs(link.rise/link.length)<.1,'direct bridge grade below 10%');
});
test('rear return shares exact floor datums at both U corners and meets both buildings',()=>{
 assert.equal(links.length,4);assert.deepEqual(links[1].b,links[2].a);assert.deepEqual(links[2].b,links[3].a);
 assert.equal(links[1].a[1],hubFloor);assert.equal(links[3].b[1],research.deck+.4);
 assert.ok(links[3].b[2]>research.z-research.halfZ);
 for(const l of links){assert.ok(l.length>0);assert.ok([...l.a,...l.b,l.angle,l.rise].every(Number.isFinite));}
 assert.deepEqual(createConnectedCampusLayout({hubFloor,terrainAt}),[],'never leave a partial connection to a missing building');
});
test('new links and research entrance remain outside verified Water structure envelope',()=>{
 for(const l of links)for(let i=0;i<=100;i++){
  const t=i/100,x=l.a[0]+(l.b[0]-l.a[0])*t,z=l.a[2]+(l.b[2]-l.a[2])*t;
  assert.ok(Math.abs(x+19.3)>22.5+CONNECTOR_WIDTH/2||Math.abs(z+43.3)>22.5+CONNECTOR_WIDTH/2);
 }
 assert.ok(research.z+research.halfZ+3.6 < -65.8);
});
test('flight remains production-owned while local camera and ground wiring stay isolated',()=>{
 const world=readFileSync(new URL('../../src/core/mars/exploration/MarsExploreWorld.tsx',import.meta.url),'utf8');
 assert.match(world,/const localV11Enabled = !flying;/);
 assert.match(world,/<AresFlightSession onEntry=\{setLandedHandoff\}/);
 assert.match(world,/interiorAt=\{localCampusRuntime\?\.interiorAt\}/);assert.match(world,/environmentAt=\{localCampusRuntime\?\.cameraEnvironmentAt\}/);
});

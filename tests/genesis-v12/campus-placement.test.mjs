import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectCampusBuildings,freeFootprint,HUB_ENVELOPE} from '../../src/core/mars/exploration/separate-v11/connected-campus-layout.mjs';
import {buildings} from './campus-fixture.mjs';
test('both preserved V11 buildings fit real ARES terrain without slope bypasses',()=>{
 assert.equal(buildings.length,2);
 for(const b of buildings){const s=b.plan.sites[0];assert.ok(s.max-s.min<=1.5);assert.ok(s.slope<=12);assert.ok(s.deck>s.max);assert.ok(freeFootprint(b.footprint,buildings.filter(o=>o!==b).map(o=>o.footprint)));}
 assert.deepEqual(buildings.map(b=>[b.id,b.worldX,b.worldZ]),[['greenhouse',-70,-68],['habitat',-7,-82]]);
 assert.ok(buildings[0].worldX<HUB_ENVELOPE.xMin);assert.ok(buildings[1].worldX>HUB_ENVELOPE.xMax);
});
test('scene retains one original Hub and player-owned colony visuals',()=>{
 const world=readFileSync(new URL('../../src/core/mars/exploration/MarsExploreWorld.tsx',import.meta.url),'utf8');
 assert.equal((world.match(/<AresCommandHub\s/g)??[]).length,1);
 assert.equal((world.match(/<AresColonyBuildings\s/g)??[]).length,1);
 assert.match(world,/localV11Enabled && <LocalV11Boundary>/);
 assert.match(world,/walkableSurface=\{localCampusRuntime\?\.walkableSurface\}/);assert.match(world,/\.\.\.\(localCampusRuntime\?\.obstacles\?\?\[\]\)/);
});

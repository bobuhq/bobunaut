import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCampusLandscape} from '../../src/core/mars/exploration/separate-v11/campus-landscape.mjs';
import {createGardenFinish,gardenGroundClear} from '../../src/core/mars/exploration/separate-v11/garden-finish.mjs';
import {buildings,terrainAt} from './campus-fixture.mjs';
const plan=createCampusLandscape(buildings,terrainAt),finish=createGardenFinish(plan);
const intersects=(a,b,pad=0)=>a.xMin<b.xMax+pad&&a.xMax>b.xMin-pad&&a.zMin<b.zMax+pad&&a.zMax>b.zMin-pad;
const footprint=b=>({xMin:b.x-b.width/2,xMax:b.x+b.width/2,zMin:b.z-b.depth/2,zMax:b.z+b.depth/2});
const corners=r=>[[r.xMin,r.zMin],[r.xMax,r.zMin],[r.xMin,r.zMax],[r.xMax,r.zMax]];
test('garden finish preserves the current promenade, collision array and walkable callback',()=>{
 const before=JSON.stringify(plan),obstacles=plan.obstacles,paths=plan.paths,floor=plan.floor;
 const samples=[[-44,-57.2],[-44,-40],[-44,-17],[7,-62],[-7,-71.4]].map(p=>plan.floor(...p));
 createGardenFinish(plan);assert.equal(JSON.stringify(plan),before);assert.equal(plan.obstacles,obstacles);assert.equal(plan.paths,paths);assert.equal(plan.floor,floor);
 assert.deepEqual([[-44,-57.2],[-44,-40],[-44,-17],[7,-62],[-7,-71.4]].map(p=>plan.floor(...p)),samples);
});

test('V13 landscape contains no obsolete planters or collision objects',()=>{
 assert.deepEqual(plan.planters,[]);
 assert.deepEqual(plan.benches,[]);
 assert.deepEqual(plan.lamps,[]);
 assert.deepEqual(plan.obstacles,[]);
 assert.deepEqual(finish.beds,[]);
 assert.deepEqual(finish.edgeBands,[]);
 assert.deepEqual(finish.edgeLights,[]);
 assert.deepEqual(finish.gravelBands,[]);
 assert.deepEqual(finish.joints,[]);
});

test('V13 retains the original terrain and protected Water parcel',()=>{
 assert.equal(typeof plan.floor,'function');
 assert.equal(typeof plan.terrainAt,'function');
 assert.ok(plan.paths.length>=8);
 assert.ok(plan.cells.length>0);
 assert.equal(plan.floor(-19,-43),null);
 assert.equal(plan.floor(-44,-68),null);
 assert.ok(finish.forecourt.zMin>=-57.15);
 assert.ok(finish.forecourt.xMax<-41.8);
});

test('visual cleanup cannot add physical barriers or mutate traversal',()=>{
 const before=JSON.stringify(plan);
 const result=createGardenFinish(plan);
 assert.equal(JSON.stringify(plan),before);
 assert.deepEqual(result.beds,[]);
 assert.deepEqual(result.edgeLights,[]);
 assert.deepEqual(result.edgeBands,[]);
 assert.equal(plan.obstacles.length,0);
});

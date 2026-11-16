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
test('Hub approach gets eight complete mirrored garden pairs and a paired arrival zone',()=>{
 const axis=finish.beds.filter(b=>b.id.startsWith('hub-axis-'));assert.equal(axis.length,16);
 for(let i=0;i<8;i++){const pair=axis.filter(b=>b.id.startsWith('hub-axis-'+i+'-'));assert.equal(pair.length,2);assert.equal(pair[0].z,pair[1].z);assert.ok(Math.abs(pair[0].x+pair[1].x+88)<1e-8);assert.equal(pair[0].width,pair[1].width);}
 assert.equal(finish.beds.filter(b=>b.id.startsWith('hub-arrival')).length,2);
 assert.equal(finish.beds.filter(b=>b.id.startsWith('botanical-approach')).length,2);
 assert.equal(finish.beds.filter(b=>b.id.startsWith('genesis-arrival')).length,2);
 assert.equal(finish.beds.filter(b=>b.id.startsWith('court-island')).length,4);
});
test('all garden beds avoid open paths, old furniture and the protected Water/building/stair footprints',()=>{
 for(const b of finish.beds){const box=footprint(b);
  assert.ok(corners(box).every(([x,z])=>gardenGroundClear(x,z,finish.researchX)),b.id+' respects protected architecture');
  assert.ok(!plan.paths.some(p=>intersects(box,p,.12)),b.id+' leaves circulation clear');
  assert.ok(!plan.obstacles.some(o=>o.kind==='box'&&intersects(box,{xMin:o.x-o.halfWidth,xMax:o.x+o.halfWidth,zMin:o.z-o.halfDepth,zMax:o.z+o.halfDepth},.12)),b.id+' avoids existing collision bodies');
 }
 for(let i=0;i<finish.beds.length;i++)for(let j=i+1;j<finish.beds.length;j++)assert.equal(intersects(footprint(finish.beds[i]),footprint(finish.beds[j])),false,'beds stay distinct');
 assert.ok(finish.forecourt.zMin>=-57.15,'forecourt stops before the original stairs');assert.ok(finish.forecourt.xMax<-42,'arrival paving stays clear of Water');
});
test('paired composition never leaves a one-sided fragment if an existing obstacle blocks one side',()=>{
 const result=createGardenFinish({...plan,obstacles:[...plan.obstacles,{kind:'box',x:-45.6,z:-40.9,halfWidth:.25,halfDepth:1}]});
 assert.equal(result.beds.filter(b=>b.id.startsWith('hub-axis-2-')).length,0);assert.equal(plan.planters.length,8,'existing planters stay in place');
});
test('promenade edging follows the approved footprint and never puts an edge band across its main axis',()=>{
 assert.ok(finish.edgeBands.length>100);assert.ok(finish.edgeLights.length>80);
 for(const r of [...finish.edgeBands,...finish.gravelBands,...finish.edgeLights,...finish.joints])assert.ok(corners(r).every(([x,z])=>gardenGroundClear(x,z,finish.researchX)));
 for(let z=-51;z<=-19;z+=.2)assert.equal(finish.edgeBands.some(r=>-44>=r.xMin-.08&&-44<=r.xMax+.08&&z>=r.zMin-.08&&z<=r.zMax+.08),false,'edge remains alongside the walkway');
});

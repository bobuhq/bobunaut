import {entryHeight} from './v11-composition.mjs';
import {genesisWorldToLocal} from './3d/production-collision-adapter.mjs';
/** Same analytic heights as V11 visible paving. Additive; null outside paving. */
export function v11PavingFloor(site,x,z){
 const [lx,lz]=genesisWorldToLocal(x,z,site.placement);
 const h=entryHeight(site.surfaceAtLocal,lx,lz,site.floorWorldY-site.rootY);
 return h===null?null:h+site.rootY;
}
/** Proposed host extension only: preserve all unknown horizontal obstacles.
 * Host must supply the swept capsule vertical interval at each movement substep,
 * not the last grounded height. Never feed this filtered list to the old controller.
 */
export function heightAwareObstacles(obstacles,feetMin,headMax){
 if(!Number.isFinite(feetMin)||!Number.isFinite(headMax)||headMax<=feetMin)throw Error('Invalid capsule sweep');
 return obstacles.filter(o=>!Number.isFinite(o.yMin)||!Number.isFinite(o.yMax)||o.yMax<o.yMin||o.yMax>=feetMin&&o.yMin<=headMax);
}

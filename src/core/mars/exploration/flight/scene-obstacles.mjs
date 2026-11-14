import {Box3, Matrix4} from 'three';

/** Resolve physical heights from visible world geometry, including every instance. */
export function resolveSceneObstacles(scene, obstacles, excluded) {
 scene.updateMatrixWorld(true);
 const boxes=[], instance=new Matrix4(), world=new Matrix4();
 scene.traverse(o=>{
  if(!o.isMesh)return;
  for(let p=o;p;p=p.parent)if(!p.visible||p===excluded||p.userData.offlineTerrain||p.name==='dev-only-cinematic-landing')return;
  o.geometry.computeBoundingBox();
  const local=o.geometry.boundingBox;
  if(!local)return;
  const add=matrix=>{
   const b=new Box3().copy(local).applyMatrix4(matrix);
   if(!b.isEmpty()&&Number.isFinite(b.max.y)&&b.max.x-b.min.x<75&&b.max.z-b.min.z<75)boxes.push(b);
  };
  if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);add(world.multiplyMatrices(o.matrixWorld,instance));}}
  else add(o.matrixWorld);
 });
 return obstacles.map(o=>{
  if(o.groundOnly===true||Number.isFinite(o.height)||Number.isFinite(o.topY))return o;
  const rx=o.halfWidth??o.radius,rz=o.halfDepth??o.radius;
  const matches=boxes.filter(b=>b.min.x<=o.x+rx&&b.max.x>=o.x-rx&&b.min.z<=o.z+rz&&b.max.z>=o.z-rz);
  return matches.length?{...o,topY:Math.max(...matches.map(b=>b.max.y))}:o;
 });
}

import * as THREE from 'three';
export type WallObstacle={kind:'box';x:number;z:number;halfWidth:number;halfDepth:number};
/** Horizontal body-height section of the actual cut shell, not its enclosing box.
 * Short AABBs follow curved/diagonal GLB walls with <= 4cm excess thickness. */
export function meshWallObstacles(mesh:THREE.Mesh,toRoot:THREE.Matrix4,height=1.35):WallObstacle[]{
 const geometry=mesh.geometry,p=geometry.getAttribute('position'),index=geometry.index,result:WallObstacle[]=[];
 const count=index?.count??p.count;
 for(let i=0;i<count;i+=3){
  const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(toRoot));
  const points:THREE.Vector3[]=[];
  for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],da=a.y-height,db=b.y-height;
   if(da*db<0)points.push(a.clone().lerp(b,da/(da-db)));
   else if(Math.abs(da)<1e-7)points.push(a.clone());
  }
  if(points.length<2)continue;
  const a=points[0],b=points[1],n=Math.max(1,Math.ceil(a.distanceTo(b)/.25));
  for(let j=0;j<n;j++){const p=a.clone().lerp(b,j/n),q=a.clone().lerp(b,(j+1)/n);result.push({kind:'box',x:(p.x+q.x)/2,z:(p.z+q.z)/2,halfWidth:Math.max(.035,Math.abs(q.x-p.x)/2),halfDepth:Math.max(.035,Math.abs(q.z-p.z)/2)});}
 }
 return result;
}

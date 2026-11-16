import * as THREE from 'three';

/** Subtract an axis-aligned aperture in root coordinates. Clips triangles at
 * the six planes instead of dropping whole faces or using a render-only mask.
 * Source geometry/cache is never mutated. UVs, normals and material groups survive. */
export function subtractBoxGeometry(source:THREE.BufferGeometry, toRoot:THREE.Matrix4, aperture:THREE.Box3) {
  if(!source.boundingBox)source.computeBoundingBox();
  if(!source.boundingBox!.clone().applyMatrix4(toRoot).intersectsBox(aperture))return null;
  const geometry=source.index?source.toNonIndexed():source.clone();
  const position=geometry.getAttribute('position');
  const names=Object.keys(geometry.attributes).filter(name=>!['skinIndex','skinWeight'].includes(name));
  const sizes=names.map(name=>geometry.getAttribute(name).itemSize);
  type Vertex={p:THREE.Vector3;attrs:number[][]};
  const output:number[][]=names.map(()=>[]);const groups:Array<{start:number;count:number;materialIndex:number}>=[];
  const planes=[new THREE.Plane(new THREE.Vector3(1,0,0),-aperture.min.x),new THREE.Plane(new THREE.Vector3(-1,0,0),aperture.max.x),new THREE.Plane(new THREE.Vector3(0,1,0),-aperture.min.y),new THREE.Plane(new THREE.Vector3(0,-1,0),aperture.max.y),new THREE.Plane(new THREE.Vector3(0,0,1),-aperture.min.z),new THREE.Plane(new THREE.Vector3(0,0,-1),aperture.max.z)];
  const interpolate=(a:Vertex,b:Vertex,t:number):Vertex=>({p:a.p.clone().lerp(b.p,t),attrs:a.attrs.map((v,i)=>v.map((n,j)=>n+(b.attrs[i][j]-n)*t))});
  const clip=(poly:Vertex[],plane:THREE.Plane,inside:boolean)=>{
    const result:Vertex[]=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=plane.distanceToPoint(a.p),db=plane.distanceToPoint(b.p);
      const ia=inside?da>=0:da<=0,ib=inside?db>=0:db<=0;
      if(ia)result.push(a);
      if(ia!==ib)result.push(interpolate(a,b,da/(da-db)));
    }return result;
  };
  let removed=false;
  for(let i=0;i<position.count;i+=3){
    let poly:Vertex[]=Array.from({length:3},(_,j)=>({p:new THREE.Vector3().fromBufferAttribute(position,i+j).applyMatrix4(toRoot),attrs:names.map((name,k)=>Array.from({length:sizes[k]},(_,c)=>geometry.getAttribute(name).array[(i+j)*sizes[k]+c]))}));
    const pieces:Vertex[][]=[];
    for(const plane of planes){if(!poly.length)break;const outside=clip(poly,plane,false);if(outside.length>=3)pieces.push(outside);poly=clip(poly,plane,true);}
    if(poly.length>=3)removed=true;
    const start=output[0].length/sizes[0];
    for(const piece of pieces)for(let j=1;j<piece.length-1;j++)for(const v of [piece[0],piece[j],piece[j+1]])v.attrs.forEach((a,k)=>output[k].push(...a));
    const count=output[0].length/sizes[0]-start;
    const materialIndex=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0;
    if(count){const prev=groups.at(-1);if(prev?.materialIndex===materialIndex)prev.count+=count;else groups.push({start,count,materialIndex});}
  }
  geometry.dispose();if(!removed)return null;
  const result=new THREE.BufferGeometry();names.forEach((name,i)=>result.setAttribute(name,new THREE.Float32BufferAttribute(output[i],sizes[i])));groups.forEach(g=>result.addGroup(g.start,g.count,g.materialIndex));result.computeBoundingBox();result.computeBoundingSphere();return result;
}

export function createHubRearAperture(baseY:number){
 return new THREE.Box3(new THREE.Vector3(-41.4,baseY+.02,-80.5),new THREE.Vector3(-38.6,baseY+3.6,-75.25));
}
export function openResearchShell(scene:THREE.Group,scale:number){
 const owned:THREE.BufferGeometry[]=[];scene.updateMatrixWorld(true);
 scene.traverse(node=>{const o=node as THREE.Mesh;if(o.isMesh){
  const matrix=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(o.matrixWorld);
  for(const [zMin,zMax] of [[-8,-3.6],[3.6,8]]){
   const cut=subtractBoxGeometry(o.geometry,matrix,new THREE.Box3(new THREE.Vector3(-1.4,.405,zMin),new THREE.Vector3(1.4,3.6,zMax)));
   if(cut){owned.push(cut);o.geometry=cut;}
  }
 }});return owned;
}

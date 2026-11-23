import * as THREE from 'three';
import type {CameraEnvironment} from '../separate-v11/campus-experience';
export const CAMERA_CLEARANCE=.22;
const RAY_OFFSETS = [[0, 0], [-.14, 0], [.14, 0], [0, .14], [0, -.14]] as const;
const LOOK_RAY_NEAR = .025;
const RAY_BOUNDS_PADDING = CAMERA_CLEARANCE + .14;
/** A sphere-sized five-ray boom against actual geometry, including transparent
 * windows and the cut door apertures. Reverse rays catch single-sided ceilings. */
export class MarsCameraClearance {
 private entries:Array<{mesh:THREE.Mesh;box:THREE.Box3;matrix:THREE.Matrix4;instanceVersion?:number;instanceCount?:number}>=[];
 private ray=new THREE.Raycaster();private direction=new THREE.Vector3();private right=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);
 private start=new THREE.Vector3();private end=new THREE.Vector3();private segment=new THREE.Box3();
 private reverseDirection=new THREE.Vector3();
 private candidates:THREE.Mesh[]=[];
 private hits:THREE.Intersection[]=[];
 refresh(roots:THREE.Object3D[]){
  const previous=new Map(this.entries.map(e=>[e.mesh,e]));this.entries=[];
  for(const root of roots)root.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh||mesh.userData.cameraIgnore)return;
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   if(materials.every(m=>!m.visible||(m.transparent&&m.opacity<=.01)||m.blending===THREE.AdditiveBlending||('wireframe' in m&&m.wireframe&&m.transparent)))return;
   const instanced=mesh as THREE.InstancedMesh;
   const entry=previous.get(mesh)??{mesh,box:new THREE.Box3(),matrix:new THREE.Matrix4().makeScale(0,0,0)};
   if(instanced.isInstancedMesh){
    if(!instanced.boundingBox || entry.instanceVersion!==instanced.instanceMatrix.version || entry.instanceCount!==instanced.count){
     instanced.computeBoundingBox();
     entry.instanceVersion=instanced.instanceMatrix.version;
     entry.instanceCount=instanced.count;
     entry.matrix.makeScale(0,0,0);
    }
   }else if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   this.entries.push(entry);
  });
 }
 private visible(mesh:THREE.Mesh){let o:THREE.Object3D|null=mesh,attached=false;while(o){if(!o.visible)return false;if((o as THREE.Scene).isScene)attached=true;o=o.parent;}return attached;}
 clamp(look:THREE.Vector3,eye:THREE.Vector3){
  this.direction.subVectors(eye,look);const length=this.direction.length();if(length<.02)return length;this.direction.multiplyScalar(1/length);
  this.right.crossVectors(this.direction,this.up).normalize();if(this.right.lengthSq()<.1)this.right.set(1,0,0);
  this.segment.min.copy(look).min(eye);
  this.segment.max.copy(look).max(eye);
  this.segment.expandByScalar(RAY_BOUNDS_PADDING);
  const candidates=this.candidates;
  candidates.length=0;
  for(const e of this.entries){if(!this.visible(e.mesh))continue;e.mesh.updateWorldMatrix(true,false);
   if(!e.matrix.equals(e.mesh.matrixWorld)){e.matrix.copy(e.mesh.matrixWorld);e.box.copy((e.mesh as THREE.InstancedMesh).isInstancedMesh?(e.mesh as THREE.InstancedMesh).boundingBox!:e.mesh.geometry.boundingBox!).applyMatrix4(e.matrix);}
   if(e.box.intersectsBox(this.segment))candidates.push(e.mesh);
  }
  if(!candidates.length)return length;
  let allowed=length;
  const rayLength=length+CAMERA_CLEARANCE;
  this.reverseDirection.copy(this.direction).negate();
  for(const [side,vertical] of RAY_OFFSETS){
   this.start.copy(look).addScaledVector(this.right,side).addScaledVector(this.up,vertical);
   this.end.copy(this.start).addScaledVector(this.direction,rayLength);
   this.ray.set(this.start,this.direction);this.ray.near=LOOK_RAY_NEAR;this.ray.far=rayLength;
   this.hits.length=0;
   this.ray.intersectObjects(candidates,false,this.hits);
   if(this.hits.length)allowed=Math.min(allowed,this.hits[0].distance-CAMERA_CLEARANCE);

   // Cast back over the same segment. A surface behind the look target
   // must never be interpreted as an obstruction between it and the eye.
   this.ray.set(this.end,this.reverseDirection);
   this.ray.near=0;this.ray.far=rayLength-LOOK_RAY_NEAR;
   this.hits.length=0;
   this.ray.intersectObjects(candidates,false,this.hits);
   const farthest=this.hits.at(-1);
   if(farthest)allowed=Math.min(allowed,rayLength-farthest.distance-CAMERA_CLEARANCE);
  }
  allowed=Math.max(.08,allowed);if(allowed<length)eye.copy(look).addScaledVector(this.direction,allowed);
  return allowed;
 }
 solve(look:THREE.Vector3,eye:THREE.Vector3,environment:CameraEnvironment|null){
  if(environment)eye.y=THREE.MathUtils.clamp(eye.y,environment.floor+.65,environment.ceiling-.28);
  this.clamp(look,eye);
  if(environment?.narrow&&eye.distanceTo(look)<1.85){
   // Keep mouse-controlled horizontal yaw. Raising only the eye provides a
   // full-body oblique view instead of pushing the lens into the helmet.
   eye.y=Math.max(eye.y,Math.min(environment.floor+2.65,environment.ceiling-.32));
   this.clamp(look,eye);
  }
  return eye.distanceTo(look);
 }
}
export function followCameraRadius(current:number,target:number,delta:number){return THREE.MathUtils.damp(current,target,target<current?12:2.8,Math.min(delta,.1));}

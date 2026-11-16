import {useLayoutEffect,useRef,type ReactNode} from 'react';
import * as THREE from 'three';
import {subtractBoxGeometry,createHubRearAperture} from './portal-geometry';

/** A local architectural aperture through the original rear wall layers only.
 * Front entrance, terminal components and their private geometries are untouched. */
export function CampusHubRearOpening({enabled,children}:{enabled:boolean;children:ReactNode}) {
  const root=useRef<THREE.Group>(null);
  useLayoutEffect(()=>{
    if(!enabled||!root.current)return;
    const changed=new Map<THREE.Mesh,{original:THREE.BufferGeometry;cut:THREE.BufferGeometry}>();
    const checked=new WeakMap<THREE.Mesh,THREE.BufferGeometry>();
    let aperture=createHubRearAperture(0);
    const apply=()=>{
      root.current?.updateWorldMatrix(true,true);
      const hub=root.current?.children[0];if(!hub)return;
      aperture=createHubRearAperture(hub.position.y);
      root.current?.traverse(o=>{
        if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||checked.get(o)===o.geometry)return;
        checked.set(o,o.geometry);
        const cut=subtractBoxGeometry(o.geometry,o.matrixWorld,aperture);
        if(cut){changed.set(o,{original:o.geometry,cut});o.geometry=cut;checked.set(o,cut);}
      });
    };
    apply();const timer=setInterval(apply,750);
    return()=>{clearInterval(timer);for(const [mesh,{original,cut}] of changed){if(mesh.geometry===cut)mesh.geometry=original;cut.dispose();}};
  },[enabled]);
  return <group ref={root} name="campus-original-hub-rear-aperture">{children}</group>;
}

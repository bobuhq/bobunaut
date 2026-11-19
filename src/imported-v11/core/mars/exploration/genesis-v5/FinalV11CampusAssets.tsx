// Extracted from final V11. Only architecture dependencies retained.
import { useMemo, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { CampusGLTFLoader } from '../../../../../core/mars/exploration/separate-v11/CampusGLTFLoader';
import * as THREE from 'three';
import { markAresStage, startAresStage } from '../../../../../core/mars/exploration/engine/aresPerformance';
import { meshWallObstacles, type WallObstacle } from '../../../../../core/mars/exploration/separate-v11/mesh-wall-obstacles';
import { openResearchShell } from '../../../../../core/mars/exploration/separate-v11/portal-geometry';
import type { CampusPlan, CampusSite } from './3d/campus-layout.mjs';
function Asset({site,traversable=false,onHullObstacles}:{site:CampusSite;traversable?:boolean;onHullObstacles?:(o:WallObstacle[])=>void}){
 const gltf=useLoader(CampusGLTFLoader,'/mars/final-v11/campus/'+site.file);
 const kit = useMemo(() => {
   const finishKit = startAresStage('campus-glb-prepare');
   try {
     const scene = gltf.scene.clone(true);
     const owned: THREE.Material[] = [];
     const geometries: THREE.BufferGeometry[] = [];
     const obstacles: WallObstacle[] = [];
     const cutPortals = traversable && site.id === 'habitat';
     if (cutPortals) {
       const finishPortal = startAresStage('campus-glb-portal-cut');
       geometries.push(...openResearchShell(scene, site.scale));
       finishPortal?.();
     }

     const greenhouse = site.id === 'greenhouse';
     const opaque = greenhouse
       ? new THREE.MeshPhysicalMaterial({color:'#aab9c1',roughness:.4,metalness:.65,side:THREE.DoubleSide})
       : new THREE.MeshStandardMaterial({color:'#8296a4',metalness:.55,roughness:.44});
     const glass = greenhouse
       ? new THREE.MeshPhysicalMaterial({color:'#71c6d9',transparent:true,opacity:.16,depthWrite:false,roughness:.16,metalness:.15,side:THREE.DoubleSide})
       : null;
     owned.push(opaque);
     if (glass) owned.push(glass);

     const scale = new THREE.Matrix4().makeScale(site.scale, site.scale, site.scale);
     const world = new THREE.Matrix4();
     let firstDraw = true;
     const finishTraversal = startAresStage('campus-glb-material-and-wall-traversal');
     scene.traverse((object) => {
       if (!(object instanceof THREE.Mesh)) return;
       const glazing = glass && ['shell', 'glazing', 'hatch-glass'].includes(object.name);
       object.material = glazing ? glass : opaque;
       if (glazing) object.renderOrder = 2;
       if (cutPortals) obstacles.push(...meshWallObstacles(object, world.multiplyMatrices(scale, object.matrixWorld)));
       if (import.meta.env.DEV) {
         const afterRender = object.onAfterRender;
         object.onAfterRender = function (...args) {
           object.onAfterRender = afterRender;
           if (firstDraw) {
             firstDraw = false;
             markAresStage('campus-glb-first-draw');
           }
           afterRender.apply(this, args);
         };
       }
     });
     finishTraversal?.();
     markAresStage('campus-glb-prepared', { wallObstacles: obstacles.length });
     return {scene, owned, geometries, obstacles};
   } finally {
     finishKit?.();
   }
 }, [gltf, site.id, site.scale, traversable]);
 useEffect(()=>()=>{kit.owned.forEach(m=>m.dispose());kit.geometries.forEach(g=>g.dispose());},[kit]);
 useEffect(()=>{markAresStage('campus-glb-commit');},[kit]);
 useEffect(()=>{if(site.id==='habitat')onHullObstacles?.(kit.obstacles);},[kit,onHullObstacles,site.id]);
 return <group position={[site.x,site.deck,site.z]} scale={site.scale}><primitive object={kit.scene}/></group>;
}
export function CampusAssets({plan,traversable=false,onHullObstacles}:{plan:CampusPlan;traversable?:boolean;onHullObstacles?:(o:WallObstacle[])=>void}){
 return <group name="v11-preserved-campus-assets">{plan.sites.map(s=><group key={s.id}><Asset site={s} traversable={traversable} onHullObstacles={onHullObstacles}/><mesh position={[s.x,s.deck-.09,s.z]}><boxGeometry args={[s.width,.18,s.depth]}/><meshStandardMaterial color="#74675d" roughness={.65}/></mesh>{(traversable&&s.id==='habitat'?[]:s.feet).map((f,i)=><mesh key={i} position={[f.x,(f.ground+s.deck)/2-.1,f.z]}><cylinderGeometry args={[.3,.5,Math.max(.15,s.deck-f.ground),8]}/><meshStandardMaterial color="#62574e"/></mesh>)}</group>)}</group>;
}

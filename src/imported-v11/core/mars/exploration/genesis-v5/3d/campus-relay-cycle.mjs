import {Vector3} from 'three';
import {RELAY_EMITTER,RELAY_BORESIGHT} from './relay-motion.mjs';
export const RELAY_CYCLE_SECONDS=62;
// World metres, above the existing Command Hub. Optical effect only, no collider.
export const RELAY_CONVERGENCE=Object.freeze([-44,65,-68]);
const tau=2*Math.PI;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
export function relayCycle(seconds,spec){
 const t=((seconds%62)+62)%62;
 const yaw=spec.base+Math.sin(t*tau/62+spec.period)*.75;
 const pitch=-.65+Math.sin(t*tau/62+spec.period*.7)*.18;
 const weight=t<45?0:t<50?smooth((t-45)/5):t<=57?1:1-smooth((t-57)/5);
 return {time:t,yaw,pitch,weight,phase:t<45?'scan':t<50?'aim':t<=57?'converge':'return'};
}
/** Solve against the moving feed, not the pedestal or a guessed beam origin.
 * Parent-local solution includes scene translation, yaw and uniform GLB scale. */
export function aimRelay(az,el,target){
 const local=az.parent.worldToLocal(new Vector3(...target)).sub(az.position);
 const yaw=Math.atan2(local.x,local.z);
 az.rotation.y=yaw;
 let pitch=0;
 const origin=new Vector3(),direction=new Vector3(),desired=new Vector3();
 for(let i=0;i<16;i++){
  el.rotation.x=pitch;el.updateWorldMatrix(true,false);
  origin.set(...RELAY_EMITTER).applyMatrix4(el.matrixWorld);
  desired.set(...target).sub(origin);
  // Elevation rotates around local X: positive X rotation lowers +Z boresight.
  el.parent.updateWorldMatrix(true,false);
  direction.copy(desired).transformDirection(el.parent.matrixWorld.clone().invert());
  pitch=Math.atan2(RELAY_BORESIGHT[1],RELAY_BORESIGHT[2])-Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
 }
 return {yaw,pitch};
}
export function applyRelayCycle(az,el,seconds,spec,target=RELAY_CONVERGENCE){
 const cycle=relayCycle(seconds,spec);
 const aim=aimRelay(az,el,target);
 const delta=Math.atan2(Math.sin(aim.yaw-cycle.yaw),Math.cos(aim.yaw-cycle.yaw));
 az.rotation.y=cycle.yaw+delta*cycle.weight;
 el.rotation.x=cycle.pitch+(aim.pitch-cycle.pitch)*cycle.weight;
 el.updateWorldMatrix(true,true);
 return cycle;
}

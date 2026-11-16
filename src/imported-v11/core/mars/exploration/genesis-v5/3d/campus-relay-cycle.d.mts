import type {Object3D} from 'three';
export const RELAY_CYCLE_SECONDS: number;
export const RELAY_CONVERGENCE: readonly [number,number,number];
type Spec={base:number;period:number};
export function relayCycle(seconds:number,spec:Spec):{time:number;yaw:number;pitch:number;weight:number;phase:string};
export function aimRelay(az:Object3D,el:Object3D,target:readonly number[]):{yaw:number;pitch:number};
export function applyRelayCycle(az:Object3D,el:Object3D,seconds:number,spec:Spec,target?:readonly number[]):ReturnType<typeof relayCycle>;

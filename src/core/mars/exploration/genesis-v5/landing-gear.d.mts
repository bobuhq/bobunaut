export type GearState='STOWED'|'DEPLOYING'|'LOCKED'|'DESCENDING'|'GROUND_CONTACT'|'COMPRESSING'|'SETTLED'|'RETRACTING';
export const FEET:readonly (readonly number[])[];
export const PARTICLE_BUDGET:number;
export const transitions:Record<GearState,GearState[]>;
export type Support={valid:boolean;contactVerified?:boolean;padClearances?:number[];heights:number[];slopes:number[];tilt:number;relief:number;highest:number;reason:string};
export class LandingGear {state:GearState;elapsed:number;extension:number;transition(next:GearState,support?:Support):boolean;step(dt:number):void;}
export function inspectSupport(sample:(x:number,z:number)=>number,x?:number,z?:number):Support;
export function footpadY(ground:number,nominal:number):number;
export function effects(time:number,height:number,power:number,out?:{light:number;radius:number;dust:number}):{light:number;radius:number;dust:number};

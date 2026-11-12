export type LandingObstacle = {kind:'box';x:number;z:number;halfWidth:number;halfDepth:number}|{kind:'circle';x:number;z:number;radius:number};
export const GREEN_LANDING_ZONE: Readonly<{x:number;z:number;radius:number;safetyClearance:number}>;
export const LANDING_PROTECTED_AREAS: readonly LandingObstacle[];
export function validateLandingOrParking(request:{x:number;z:number;vehicleRadius:number;safetyClearance?:number},obstacles?:LandingObstacle[]):{valid:boolean;reason:string};
export function landingPreviewRockVisible(rock:{x:number;z:number;width?:number;depth?:number;radius?:number}):boolean;

import type { Rect } from './campus-traversal.mjs';
import type { Landscape } from './campus-landscape.mjs';
export type GardenBed = {id:string;x:number;z:number;width:number;depth:number;seed:number};
export type GardenFinish = {
 approved:Rect[];edgeBands:Rect[];gravelBands:Rect[];edgeLights:Rect[];
 beds:GardenBed[];forecourt:Rect;joints:Rect[];
 studs:{x:number;z:number;purple:boolean}[];researchX:number;
};
export function gardenGroundClear(x:number,z:number,researchX?:number):boolean;
export function createGardenFinish(plan:Landscape):GardenFinish;

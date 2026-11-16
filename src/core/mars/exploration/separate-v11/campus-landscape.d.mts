import type { Rect, Edge } from './campus-traversal.mjs';
import type { PlannedBuilding } from './connected-campus-layout.mjs';
import type { MarsCollisionObstacle } from '../components/BobuCharacterController';
export type Landscape = {
 cells:Rect[];plazas:Rect[];paths:Rect[];
 planters:{x:number;z:number;width:number;depth:number;id:string}[];
 benches:{x:number;z:number}[];
 lamps:[number,number][];
 borders:Edge[];
 obstacles:MarsCollisionObstacle[];
 floor:(x:number,z:number)=>number|null;
 terrainAt:(x:number,z:number)=>number;
};
export function createCampusLandscape(buildings:PlannedBuilding[],terrainAt:(x:number,z:number)=>number):Landscape|null;

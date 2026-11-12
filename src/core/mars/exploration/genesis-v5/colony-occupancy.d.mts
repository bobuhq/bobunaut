import type {MarsColonyBaseBuilding} from '../../MarsColonyBaseService';
export type Area={id:string;kind:'box';x:number;z:number;halfWidth:number;halfDepth:number}|{id:string;kind:'circle';x:number;z:number;radius:number};
export function buildingOccupancy(rows:MarsColonyBaseBuilding[],gridToWorld:(x:number,z:number,w:number,d:number)=>{x:number;z:number},unit:number,clearance?:number):{colonyId:string;boxes:(Extract<Area,{kind:'box'}>&{buildingKey:string;rotationY:number})[]};
export function areasOverlap(a:Area,b:Area):boolean;
export function overlappingReservations(areas:Area[]):string[][];
export const OCCUPANCY_BLOCKERS:readonly string[];
export function blockedPlacementReview(snapshot:unknown,now?:number):{status:'blocked';safeCandidates:never[];blockers:string[]};

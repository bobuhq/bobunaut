import type { CampusAsset, CampusPlan } from '../../../../imported-v11/core/mars/exploration/genesis-v5/3d/campus-layout.mjs';
export type Footprint = {x:number;z:number;halfX:number;halfZ:number};
export type PlannedBuilding = {
 id:string;worldX:number;worldZ:number;plan:CampusPlan;footprint:Footprint;
};
export type Connector = {
 id:string;a:[number,number,number];b:[number,number,number];
 length:number;rise:number;grade:number;angle:number;
};
export const V11_INDIVIDUAL_BUILDING_ANCHORS: Readonly<{greenhouse:{x:number;z:number};habitat:{x:number;z:number}}>;
export const V11_INDIVIDUAL_RELAY_ANCHORS: ReadonlyArray<{x:number;z:number}>;
export const HUB: Readonly<Footprint>;
export const HUB_ENVELOPE: Readonly<{xMin:number;xMax:number;zMin:number;zMax:number}>;
export const CONNECTOR_WIDTH:number;
export const CONNECTOR_HEIGHT:number;
export function freeFootprint(candidate:Footprint, occupied:Footprint[]):boolean;
export function selectCampusBuildings(assets:CampusAsset[],terrainAt:(x:number,z:number)=>number):PlannedBuilding[];
export function createConnectedCampusLayout(input:{
 hubFloor:number;
 research:{x:number;z:number;deck:number;halfX:number;halfZ:number}|null;
 terrainAt:(x:number,z:number)=>number
}):Connector[];

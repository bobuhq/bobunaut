export const SPACECRAFT_CONTRACT: {readonly renderer:string;readonly collisionRadius:number;readonly pilotEye:readonly number[];readonly hatch:readonly number[];readonly stairs:readonly number[];readonly exit:readonly number[];readonly gearMounts:readonly (readonly number[])[]};
export function panelPositions(points: number[][]):number[];
export function shellPositions(rings:number[][],options?:{aft?:boolean}):number[];
export const HULL_SECTIONS:{lower:number[][];aft:number[][]};

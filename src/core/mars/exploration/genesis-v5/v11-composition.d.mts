export type Surface=(x:number,z:number)=>number;
export type Tower={id:string;x:number;z:number;color:string;period:number;amplitude:number;phase:number;base:number;pitch:number};
export const greenhouse:{x:number;z:number;width:number;depth:number};
export const towers:Tower[];
export const plaza:{xMin:number;xMax:number;zMin:number;zMax:number};
export function scan(t:number,s:Tower):{yaw:number;pitch:number};
export function courtyardHeight(surface:Surface,x:number,z:number,floor:number):number|null;
export function entryHeight(surface:Surface,x:number,z:number,floor:number):number|null;

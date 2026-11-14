export type FlightHandoff = {spawn:[number,number,number];ship:[number,number,number];yaw:number};
export function validHandoff(value:unknown,obstacles:readonly ({kind?:string;x:number;z:number;radius?:number;halfWidth?:number;halfDepth?:number})[],sample:(x:number,z:number)=>number):value is FlightHandoff;

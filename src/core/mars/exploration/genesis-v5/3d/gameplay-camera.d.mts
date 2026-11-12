type Point = {x:number;y:number;z:number};
export function wheelZoom(current:number,delta:number,mode:number,pageHeight:number):number;
export function advanceOrbit(state:{yaw:number;pitch:number;zoom:number;indoor:number},yaw:number,pitch:number,zoom:number,indoor:boolean,dt:number):void;
export function orbitEye(player:Point,aimHeight:number,yaw:number,pitch:number,radius:number,shoulder:number,outdoorWeight:number,out:Point):void;

type Point = {x:number;y:number;z:number};
type Bounds = {height:number;radius:number};
export function solveShoulderCamera(player:Point,yaw:number,bounds:Bounds,constrain:(look:Point,eye:Point)=>void,state:{branch?:number;blocked?:boolean},out:Point,shoulder?:number): Point | null;
export function outsideCharacter(eye:Point,player:Point,bounds:Bounds):boolean;

export function solveInteriorOrbit(player:Point,yaw:number,pitch:number,bounds:Bounds,constrain:(look:Point,eye:Point)=>void,out:Point,shoulder?:number,radius?:number):Point;

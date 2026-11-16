export const CINEMATIC_KIT_URL: string;
export type CinematicPlacement = {asset:string;position:[number,number,number];yaw:number};
export const cinematicLayout: Record<'exterior'|'control'|'corridor'|'habitat',CinematicPlacement[]>;

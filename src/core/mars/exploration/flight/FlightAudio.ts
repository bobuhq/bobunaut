import { aresArrivalSound as sound } from "../audio/AresArrivalSound";
/** Flight shares MAIN's gesture-unlocked context, preference and original PCM. */
export const flightAudio = {
  toggle() { sound.setEnabled(!sound.getEnabled()); },
  update(x:number,y:number,z:number,fx:number,fy:number,fz:number,_world?:readonly [number,number,number]) { sound.setListener(x,y,z,fx,fy,fz); },
  door(id:string,open:boolean,position:readonly [number,number,number]) { sound.door(id,open,position); },
  landingCue(kind:"extend"|"lock"|"impact"|"shutdown") { sound.flightCue(kind); },
  exitStep(index:number) { sound.flightCue("step",index); },
  stopLanding() { sound.stopFlightCues(); },
};

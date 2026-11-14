export const SCORE: Readonly<{title: string;duration:number;bpm:number;sections:readonly string[];motif:readonly number[];rate:number}>;
export const soundtrackURL: string;
export class ExplorationMusic {
 constructor(context: AudioContext,destination?: AudioNode,volume?:number);
 /** Resolves after the score has been decoded or a load error has been recorded. */
 readonly ready: Promise<void>;
 /** Set when the original WAV score could not be loaded. */
 error?: string;
 play(onEnded?:()=>void):void;
 stop():void;
 setVolume(value:number):void;
 dispose():void;
}

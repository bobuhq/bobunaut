export const CAMPUS_MUSIC_URL='/audio/ares-campus-original/campus-interior-original.wav';
/** One asynchronously decoded original local loop per unlocked ARES context.
 * Fetch/decode never blocks a movement frame or creates an AudioContext. */
export class AresInteriorMusic {
 private source:AudioBufferSourceNode|null=null;private gain:GainNode;private inside:boolean|null=null;
 private disposed=false;private retiring=false;private abort=new AbortController();readonly ready:Promise<void>;
 constructor(private context:AudioContext){
  this.gain=context.createGain();this.gain.gain.value=0;this.gain.connect(context.destination);
  this.ready=this.load();
 }
 private async load(){
  try{
   const response=await fetch(CAMPUS_MUSIC_URL,{signal:this.abort.signal});if(!response.ok||this.disposed||this.retiring)return;
   const bytes=await response.arrayBuffer();if(this.disposed||this.retiring)return;
   const buffer=await this.context.decodeAudioData(bytes);
   if(this.disposed||this.retiring||this.context.state!=='running'||buffer.numberOfChannels!==1||Math.abs(buffer.duration-32)>.02)return;
   const source=this.context.createBufferSource();this.source=source;source.buffer=buffer;source.loop=true;
   source.connect(this.gain);this.applyGain();source.start();
  }catch{/* An unavailable asset or interrupted decode remains silent. */}
 }
 private applyGain(){const now=this.context.currentTime;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(this.inside ? .32 : 0,now,.65);}
 setInside(inside:boolean){if(this.disposed||inside===this.inside)return;this.inside=inside;if(this.source)this.applyGain();}
 fadeOut(){if(this.disposed)return;this.retiring=true;this.abort.abort();const now=this.context.currentTime;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setValueAtTime(this.gain.gain.value,now);this.gain.gain.linearRampToValueAtTime(0,now+.18);try{this.source?.stop(now+.185);}catch{/* Already stopped. */}}
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();try{this.source?.stop();}catch{/* Already stopped. */}this.source?.disconnect();this.gain.disconnect();if(this.source)this.source.buffer=null;}
}

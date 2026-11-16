/** Original 32-second cyclic score: four overlapping soft A-minor/add9 pads
 * and sparse bell overtones. No samples, external recordings or copyrighted melody. */
export function createCampusMusicSamples(rate=22050){
 const seconds=32,data=new Float32Array(rate*seconds);
 const chords=[[110,164.8138,246.9417],[130.8128,195.9977,293.6648],[97.9989,146.8324,220],[146.8324,220,329.6276]];
 for(let i=0;i<data.length;i++){
  const t=i/rate;let value=0;
  for(let chord=0;chord<4;chord++){
   const age=(t-chord*8+seconds)%seconds;if(age>=12)continue;
   const envelope=Math.min(1,age/2)*Math.min(1,(12-age)/4);
   for(const hz of chords[chord])value+=.033*envelope*(Math.sin(2*Math.PI*hz*age)+.14*Math.sin(2*Math.PI*hz*2*age));
   for(const onset of [1.5,5]){const a=age-onset;if(a>0&&a<3)value+=.015*Math.min(1,a/.08)*Math.exp(-a*1.5)*(1-a/3)*Math.sin(2*Math.PI*chords[chord][2]*2*a);}
  }
  data[i]=value;
 }
 return data;
}

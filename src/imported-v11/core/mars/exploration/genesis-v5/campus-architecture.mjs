/** Decorative solids remain inside the existing sealed building colliders.
 * Metres relative to each asset deck; no reservations or walkable surfaces. */
export function campusArchitecture(id){
 const parts=[];
 const box=(name,x,y,z,w,h,d,material='alloy')=>parts.push({name,position:[x,y,z],size:[w,h,d],material});
 const lab=id==='habitat',w=lab?13.4:18.4,d=lab?13.4:10.4;
 // Common dark foundation, silver cladding and cyan datum line.
 box('foundation',0,.2,0,w,.4,d,'dark');
 for(const side of [-1,1]){
  box('side-sill',side*(w/2-.12),.55,0,.22,.35,d);
  box('side-datum',side*(w/2-.1),.8,0,.06,.07,d-.3,'cyan');
  for(let z=-d/2+.8;z<d/2;z+=2){
   box('service-panel',side*(w/2-.15),1.05,z,.2,.35,1.3,'dark');
   for(let n=0;n<4;n++)box('vent-fin',side*(w/2-.26),1.02+n*.07,z,.12,.025,1.1);
  }
 }
 if(lab){
  for(const side of [-1,1]){
   box('laboratory-wing',side*5.5,2.5,0,2.2,4.1,11.8);
   box('roof-cap',side*5.5,4.65,0,2.35,.22,12,'dark');
   for(const z of [-4,-1,2,5]){
    box('window-reveal',side*6.64,2.85,z,.12,1.85,2.3,'dark');
    box('science-window',side*6.71,2.85,z,.035,1.5,2,'glass');
    box('window-light',side*6.73,3.66,z,.025,.045,2.1,'cyan');
   }
   for(const x of [side*3.5,side*5.5]){
    box('front-frame',x,2.7,6.48,.18,4.7,.25,'dark');
    box('front-glass',x,2.75,6.36,1.55,2.7,.045,'glass');
    box('visible-instrument',x,1.6,6.1,1.2,.65,.22,'dark');
    box('instrument-display',x,1.85,6.24,.8,.17,.025,'cyan');
   }
   box('roof-equipment',side*5.5,5.05,-2,1.6,.6,2.4,'dark');
   for(let i=0;i<6;i++)box('roof-exchanger',side*5.5,5.38,-2.9+i*.35,1.4,.07,.12);
  }
  box('entry-portal',0,4.5,6.45,5.6,.65,.45,'dark');
  box('entry-canopy',0,4.05,5.85,5.6,.18,1.6);
  box('entry-light',0,3.93,6.35,4.8,.06,.12,'cyan');
  for(const side of [-1,1]){
   box('airlock-jamb',side*1.65,2.05,6.45,.32,3.8,.4);
   box('airlock-status',side*1.45,2.1,6.68,.055,3.4,.035,'purple');
   box('sealed-airlock-leaf',side*.7,1.95,6.3,1.35,3.2,.15,'dark');
   box('door-window',side*.7,2.5,6.4,.9,.85,.035,'glass');
  }
  box('upper-science-band',0,5.5,-.2,8,.28,9,'dark');
 }else{
  for(const x of [-8.6,-5.73,-2.86,0,2.86,5.73,8.6]){
   for(const side of [-1,1])box('greenhouse-upright',x,1.1,side*4.4,.12,2.2,.18);
  }
  for(const side of [-1,1]){
   box('glazing-mullion',0,2.05,side*4.4,17.4,.12,.12);
   box('grow-light',0,2.2,side*3.3,16,.06,.12,'purple');
   box('irrigation-main',0,.42,side*3,16,.08,.08,'cyan');
  }
  box('botanical-entry-header',0,3.15,5.05,4.6,.55,.3,'dark');
  for(const side of [-1,1]){
   box('botanical-entry-jamb',side*2.15,1.65,5,.22,2.6,.25);
   box('botanical-door',side*.95,1.65,5.05,1.8,2.4,.045,'glass');
   box('botanical-status',side*2,1.65,5.18,.045,2.3,.03,'cyan');
  }
  for(const x of [-7.5,7.5])box('climate-controller',x,.95,4.85,1.4,1.15,.35,'dark');
 }
 return parts;
}

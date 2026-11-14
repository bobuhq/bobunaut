import {FEET} from '../genesis-v5/landing-gear.mjs';
/** Preview-only, single bounded burst. Rearm only after leaving the ground zone. */
export const DUST_DURATION = 5;
export class LandingDust {
 age = DUST_DURATION;
 events = 0;
 armed = true;
 x = 0;
 z = 0;
 yaw = 0;
 step(dt, {height, descending, contact, x, z, yaw=0}) {
  if(height > 4 && !contact) this.armed = true;
  if(this.armed && contact) {
   this.events++; this.age = 0; this.x = x; this.z = z; this.yaw=yaw; this.armed = false;
  }
  this.age = Math.min(DUST_DURATION, this.age + Math.max(0, dt));
  return dustEnvelope(this.age);
 }
}
export function dustEnvelope(age) {
 if(age < 0 || age >= DUST_DURATION) return 0;
 const t = age / DUST_DURATION;
 return Math.min(1, age / .3) * (1 - t) ** 1.5;
}
/** Golden-angle distribution, no random emission or wrapping/recycling. */
export function dustPuff(index, age) {
 const angle = index * 2.3999632297;
 const t = Math.min(1, Math.max(0, age / DUST_DURATION));
 const radius = 3 + index % 5 * .8 + t * (5 + index % 4);
 if(index<8){const [x,z]=FEET[index%4],length=Math.hypot(x,z),spread=t*(2+index%2);
  return {x:x+x/length*spread+t*.8,z:z+z/length*spread,lift:.25+Math.sin(t*Math.PI)*.85,scale:1.2+t*2.5};}
 return {x:Math.cos(angle)*radius+t*2, z:Math.sin(angle)*radius+t*.6,
  lift:.45 + Math.sin(t*Math.PI*.8)*(1.2 + index%3*.4),
  scale:2 + t*3 + index%3*.3};
}

/** Continuous low dust is separate from the contact-only burst. */
export const thrusterDust=(height,power,contact)=>contact?0:Math.max(0,1-height/8)*Math.max(0,Math.min(1,power))*.1;

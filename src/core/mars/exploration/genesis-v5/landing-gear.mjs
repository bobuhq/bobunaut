import {validateLandingOrParking} from './green-landing-zone.mjs';
export const FEET=Object.freeze([[-6,-6],[6,-6],[6,6],[-6,6]].map(Object.freeze));
export const PARTICLE_BUDGET=96;
export const transitions=Object.freeze({STOWED:['DEPLOYING'],DEPLOYING:['LOCKED'],LOCKED:['DESCENDING','RETRACTING'],DESCENDING:['GROUND_CONTACT','RETRACTING'],GROUND_CONTACT:['COMPRESSING'],COMPRESSING:['SETTLED'],SETTLED:['RETRACTING'],RETRACTING:['STOWED']});
export class LandingGear {
 state='STOWED'; elapsed=0; extension=0;
 transition(next,support){if(!transitions[this.state].includes(next))return false;if(next==='GROUND_CONTACT'&&(!support?.valid||!support.contactVerified||support.padClearances?.length!==4||!support.padClearances.every(v=>Number.isFinite(v)&&Math.abs(v)<=.005)))return false;this.state=next;this.elapsed=0;return true;}
 step(dt){if(!Number.isFinite(dt)||dt<0)return;this.elapsed+=dt;if(this.state==='DEPLOYING'){this.extension=Math.min(1,this.elapsed/3);if(this.elapsed>=3)this.transition('LOCKED');}else if(this.state==='RETRACTING'){this.extension=Math.max(0,1-this.elapsed/3);if(this.elapsed>=3)this.transition('STOWED');}else if(this.state==='GROUND_CONTACT'&&this.elapsed>=.1)this.transition('COMPRESSING');else if(this.state==='COMPRESSING'&&this.elapsed>=.8)this.transition('SETTLED');}
}
/** Five samples across EACH pad; full gear radius includes square pad corners. */
export function inspectSupport(sample,x=110,z=-70){
 const boundary=validateLandingOrParking({x,z,vehicleRadius:10});
 const heights=[],slopes=[];let min=Infinity,max=-Infinity;
 for(const [dx,dz] of FEET){const h=sample(x+dx,z+dz);heights.push(h);let lo=h,hi=h;for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const y=sample(x+dx+a,z+dz+b);lo=Math.min(lo,y);hi=Math.max(hi,y);}slopes.push(Math.atan2(hi-lo,2)*180/Math.PI);min=Math.min(min,lo);max=Math.max(max,hi);}
 const tilt=Math.atan2(Math.max(...heights)-Math.min(...heights),12)*180/Math.PI;
 const valid=boundary.valid&&[...heights,...slopes].every(Number.isFinite)&&Math.max(...slopes)<=6&&tilt<=5&&max-min<=.8;
 return {valid,heights,slopes,tilt,relief:max-min,highest:max,reason:!boundary.valid?boundary.reason:valid?'local-support-only':'unsafe-terrain-support'};
}
export function footpadY(ground,nominal){return Math.max(ground+.23,nominal);}
export function effects(time,height,power,out={light:0,radius:0,dust:0}){const p=Math.max(0,Math.min(1,power));out.light=p*(.94+.06*Math.sin(time*8));out.radius=4+Math.max(0,height)*.45;out.dust=p*Math.max(0,1-height/32);return out;}

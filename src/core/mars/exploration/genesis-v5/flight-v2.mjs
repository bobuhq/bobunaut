import {SPACECRAFT_RADIUS,noseDirection,targetYaw,angleDelta} from './spacecraft-v3.mjs';
import {LANDING_PROTECTED_AREAS} from './green-landing-zone.mjs';
import {LandingGear, FEET} from './landing-gear.mjs';
export const FLIGHT_ZONE=Object.freeze({x:110,z:-70,radius:500});
export const VEHICLE_RADIUS=SPACECRAFT_RADIUS;
export const KEYMAP=Object.freeze({KeyW:['forward',1],KeyS:['forward',-1],KeyA:['lateral',-1],KeyD:['lateral',1],KeyQ:['yaw',1],KeyE:['yaw',-1],Space:['vertical',1],ShiftLeft:['vertical',-1],ShiftRight:['vertical',-1]});
export const emptyInput=()=>({forward:0,lateral:0,yaw:0,vertical:0});
const overlap=(x,z,r,o)=>o.kind==='box'?Math.hypot(Math.max(0,Math.abs(x-o.x)-o.halfWidth),Math.max(0,Math.abs(z-o.z)-o.halfDepth))<=r:Math.hypot(x-o.x,z-o.z)<=r+o.radius;
export class FlightV2 {
 constructor(sample,obstacles=[],bounds=6350){this.sample=sample;this.obstacles=[...obstacles];this.landingAreas=LANDING_PROTECTED_AREAS;this.landingAnchor=null;this.assist=false;this.bounds=bounds;this.x=110;this.z=-70;this.y=sample(110,-70)+45;this.vx=0;this.vz=0;this.vy=0;this.yaw=0;this.yawVelocity=0;this.desiredYaw=null;this.activeSeconds=0;this.status='MANUAL';this.trigger='';this.gear=new LandingGear();this.target=null;this.searchIndex=0;this.lastNow=null;this.power=1;this.support=null;this.cruise=0;this.autoSeconds=0;this.touchdownSeconds=null;this.deadlineReason='';this.phase='MANUAL';this.clearanceClimb=false;this.routeEstimate=0;this.lastBlocker='';this.searchOrigin={x:110,z:-70};
  if(!this.clear(this.x,this.z)){for(let i=1;i<=3200;i++){const r=Math.sqrt(i)*9,a=i*2.399963,x=110+Math.cos(a)*r,z=-70+Math.sin(a)*r;if(this.clear(x,z)&&this.inspect(x,z).highest+5.15<=this.y+.001){this.x=x;this.z=z;break;}}}
  if(!this.clear(this.x,this.z))throw new Error('No clear flight spawn inside actual terrain bounds');
  this.y=this.envelope(this.x,this.z)+45;
 }
 inside(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x-110,z+70)+VEHICLE_RADIUS<=500&&Math.abs(x)+VEHICLE_RADIUS<=this.bounds&&Math.abs(z)+VEHICLE_RADIUS<=this.bounds;}
 clear(x,z){return this.inside(x,z)&&![...this.landingAreas,...this.obstacles].some(o=>overlap(x,z,VEHICLE_RADIUS+3,o));}
 /** Overflight is different from landing permission: ground reservations are not towers. */
 airClear(x,z,y,escapingProtectedGround=false){
  if(!this.inside(x,z)){this.lastBlocker='flight-perimeter';return false;}
  const ground=this.inspect(x,z).highest;
  if(!Number.isFinite(ground)||!Number.isFinite(y)||y-5.15<ground-.001){this.lastBlocker='terrain-clearance';return false;}
  // Only a strictly upward step at the current position may escape ground policy.
  // Terrain, physical structures and perimeter still apply.
  if(!escapingProtectedGround&&this.landingAreas.some(o=>overlap(x,z,VEHICLE_RADIUS+3,o))&&y-5.15-ground<=5){this.lastBlocker='protected-ground-below-5m';return false;}
  for(const o of this.obstacles){
   if(o.groundOnly===true||!overlap(x,z,VEHICLE_RADIUS+3,o))continue;
   const top=Number.isFinite(o.topY)?o.topY:Number.isFinite(o.height)?this.sample(o.x,o.z)+o.height:NaN;
   // Unresolved physical geometry is NOT given an invented height.
   if(!Number.isFinite(top)){this.lastBlocker=`unknown-structure-height:${o.id??'unnamed'}`;return false;}
   if(y-5<=top+3){this.lastBlocker=`structure:${o.id??'unnamed'}`;return false;}
  }
  this.lastBlocker='';return true;
 }
 // A dense full-body grid plus five independent samples on each rotated footpad.
 inspect(x,z,yaw=this.yaw){
  const heights=[],slopes=[],padHighest=[];let lo=Infinity,hi=-Infinity;
  const c=Math.cos(yaw),s=Math.sin(yaw),at=(a,b)=>this.sample(x+a*c+b*s,z-a*s+b*c);
  for(let a=-10;a<=10;a++)for(let b=-10;b<=10;b++){if(Math.hypot(a,b)>10)continue;const h=at(a,b);if(!Number.isFinite(h))return {valid:false,highest:Infinity,heights,slopes,relief:Infinity,tilt:90,reason:'unknown-terrain'};lo=Math.min(lo,h);hi=Math.max(hi,h);}
  for(const [a,b] of FEET){const h=at(a,b);heights.push(h);let min=h,max=h;for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const v=at(a+dx,b+dz);min=Math.min(min,v);max=Math.max(max,v);}padHighest.push(max);slopes.push(Math.atan2(max-min,2)*180/Math.PI);lo=Math.min(lo,min);hi=Math.max(hi,max);}
  const tilt=Math.atan2(Math.max(...heights)-Math.min(...heights),12)*180/Math.PI;
  const valid=this.clear(x,z)&&Number.isFinite(hi)&&hi-lo<=.8&&Math.max(...slopes)<=6&&tilt<=5;
  return {valid,highest:hi,heights,slopes,padHighest,relief:hi-lo,tilt,reason:valid?'verified-local-support':'unsafe-terrain-or-obstacle'};
 }
 envelope(x,z){let h=-Infinity;for(let a=-10;a<=10;a+=5)for(let b=-10;b<=10;b+=5){if(Math.hypot(a,b)<=10)h=Math.max(h,this.sample(x+a,z+b));};return h;}
 reachable(x,z){
  // Required body/pad envelope plus 1m transit margin, never an arbitrary cruise height.
  const n=Math.ceil(Math.hypot(x-this.x,z-this.z)/2);let top=this.y;
  for(let i=0;i<=n;i++){
   const t=n?i/n:0,a=this.x+(x-this.x)*t,b=this.z+(z-this.z)*t;
   const h=this.inspect(a,b).highest;if(!Number.isFinite(h)||!this.inside(a,b))return null;
   top=Math.max(top,h+6.15);
   // Match airClear: protected ground requires >5m pad clearance in transit.
   if(this.landingAreas.some(o=>overlap(a,b,VEHICLE_RADIUS+3,o)))top=Math.max(top,h+10.65);
   for(const o of this.obstacles)if(overlap(a,b,VEHICLE_RADIUS+3,o)){
    if(o.groundOnly===true)continue;
    if(!Number.isFinite(o.height)&&!Number.isFinite(o.topY))return null;
    top=Math.max(top,(o.topY??(this.sample(o.x,o.z)+o.height))+8.15);
   }
  }
  return this.airClear(this.x,this.z,top)?top:null;
 }
 estimate(x,z,cruise,support){
  const d=Math.hypot(x-this.x,z-this.z),turn=d>.12?Math.abs(angleDelta(targetYaw(x-this.x,z-this.z),this.yaw))/.8+2:0;
  return turn+Math.max(0,cruise-this.y)/4+d/8+Math.max(0,cruise-support.highest-5.15)/2.5+7;
 }
 engage(reason){if(this.status!=='MANUAL'&&this.status!=='LANDING ABORTED')return;this.status='AUTO LANDING ENGAGED';this.autoSeconds=0;this.phase='SEARCH';this.trigger=reason;this.searchOrigin={x:this.x,z:this.z};this.gear.transition('DEPLOYING');}
 requestTouchdown(){
  if(this.status==='LANDED'||['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(this.gear.state))return;
  this.assist=false;
  this.landingAnchor=null;
  this.target=null;
  this.searchIndex=0;this.routeCheckAt=0;
  this.deadlineReason='';this.desiredYaw=null;this.yawVelocity=0;this.support=null;this.touchdownSeconds=null;this.assistVy=0;this.unsafeSeconds=0;this.clearanceClimb=false;this.power=1;
  this.status='MANUAL';
  this.vx=this.vy=this.vz=0;
  this.engage('F / TOUCHDOWN');
 }
 beginVerticalLanding(reason='G / VERTICAL LANDING'){
  if(this.status==='LANDED'||['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(this.gear.state))return;
  this.assist=true;this.target=null;this.landingAnchor=null;this.trigger=reason;
  this.status='VERTICAL LANDING ASSIST';this.phase='BRAKING';this.autoSeconds=0;this.unsafeSeconds=0;this.deadlineReason='';
  this.assistHeight=this.y;this.assistVy=0;this.vy=0;this.yawVelocity=0;this.desiredYaw=null;
  if(this.gear.state==='STOWED'||this.gear.state==='RETRACTING'){
   this.gear.state='STOWED';this.gear.transition('DEPLOYING');
  }
 }
 toggleGear(){if(this.status==='LANDED'||['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(this.gear.state))return;if(this.assist||(this.status!=='MANUAL'&&this.status!=='LANDING ABORTED')){this.abortLanding('G / MANUAL RECOVERY');return;}this.beginVerticalLanding();}
 abortLanding(reason){this.assist=false;this.target=null;this.landingAnchor=null;this.support=null;this.desiredYaw=null;this.yawVelocity=0;this.assistVy=0;this.vx=this.vy=this.vz=0;this.clearanceClimb=false;this.status='LANDING ABORTED';this.phase='MANUAL CONTROL / F TO RETRY';this.deadlineReason=reason;}
 verifyContact(support){
  const clearance=this.y-support.highest-5.15;
  const padClearances=(support.padHighest??[]).map(h=>{
   // Same bounded adaptive strut extension as the rendered pads.
   const extension=Math.max(0,1-Math.max(0,clearance))*(support.highest-h);
   return this.y-5*this.gear.extension-extension-.15-h;
  });
  return {...support,padClearances,contactVerified:support.valid&&this.gear.extension===1&&padClearances.length===4&&padClearances.every(v=>Number.isFinite(v)&&Math.abs(v)<=.005)&&Math.hypot(this.vx,this.vz)<=.01&&Math.abs(this.vy)<=.1};
 }
 completeContact(support){
  const contact=this.verifyContact(support);this.support=contact;
  if(!this.gear.transition('GROUND_CONTACT',contact))return false;
  this.phase='VERIFIED CONTACT';this.clearanceClimb=false;this.vx=this.vy=this.vz=0;this.assist=false;return true;
 }
 integrateVertical(dt){
  this.autoSeconds+=dt;this.gear.step(dt);
  const speed=Math.hypot(this.vx,this.vz),next=Math.max(0,speed-4*dt);
  if(speed>0){this.vx*=next/speed;this.vz*=next/speed;}
  if(!this.landingAnchor){
   const x=this.x+this.vx*dt,z=this.z+this.vz*dt;
   if((x===this.x&&z===this.z)||(this.airClear(x,z,this.y)&&this.inspect(x,z).highest+5.15<=this.y+.001)){this.x=x;this.z=z;}
   else {this.vx=this.vz=0;}
   if(Math.hypot(this.vx,this.vz)===0){this.vx=this.vz=0;this.landingAnchor={x:this.x,z:this.z};}
  }
  this.vy=0;
  if(!this.landingAnchor){this.phase='BRAKING';return;}
  const support=this.inspect(this.landingAnchor.x,this.landingAnchor.z);this.support=support;
  if(!support.valid){
   this.unsafeSeconds=(this.unsafeSeconds??0)+dt;
   this.status='HOLD / UNSAFE';this.phase=support.reason;
   if(this.unsafeSeconds>=3){this.assist=false;this.status='LANDING ABORTED';this.phase='UNSAFE SUPPORT — MANUAL CONTROL / F TO FIND SAFE SITE';this.deadlineReason=support.reason;}
   return;
  }
  this.unsafeSeconds=0;
  // Recheck airborne obstacles as well as the support before each descent step.
  if(!this.airClear(this.x,this.z,this.y)){this.assist=false;this.status='LANDING ABORTED';this.phase='OBSTRUCTED — MANUAL CONTROL / F TO FIND SAFE SITE';this.deadlineReason=this.lastBlocker;return;}
  if(this.gear.state==='LOCKED')this.gear.transition('DESCENDING');
  if(this.gear.state!=='DESCENDING'){this.phase='HOLD / GEAR DEPLOYING';return;}
  this.status='VERTICAL LANDING ASSIST';this.phase='VERTICAL DESCENT';
  const floor=support.highest+5.15,agl=Math.max(0,this.y-floor);
  const speedLimit=agl>10?2.5:agl>5?1.1:.45;
  const desired=-Math.min(speedLimit,agl*1.5);
  this.assistVy=(this.assistVy??0)+Math.max(-.8*dt,Math.min(.8*dt,desired-(this.assistVy??0)));
  this.vy=this.assistVy;this.y=Math.max(floor,this.y+this.vy*dt);
  if(this.y-floor<.005){this.vy=0;this.completeContact(support);}
 }

 pause(){this.lastNow=null;}
 step(now,input=emptyInput(),active=true){
  if(!active){this.pause();return;}if(this.lastNow===null){this.lastNow=now;return;}
  const elapsed=(now-this.lastNow)/1000;this.lastNow=now;
  // A suspended frame is not active flight time; also prevents catch-up motion.
  if(!Number.isFinite(elapsed)||elapsed<=0||elapsed>.25)return;
  // Manual flight is never taken over by the 15m proximity trigger.
  for(let left=elapsed;left>1e-8;left-=1/60)this.integrate(Math.min(left,1/60),input);
 }
 integrate(dt,input){
  if(this.status==='LANDING ABORTED'&&(input.forward||input.lateral||input.vertical||input.yaw))this.status='MANUAL';
  const agl=this.y-5.15-this.inspect(this.x,this.z).highest;
  if(this.status==='MANUAL'&&agl<=10&&(this.vy<0||input.vertical<0)){
   if(this.gear.state==='STOWED')this.gear.transition('DEPLOYING');
  }
  if(this.assist){this.integrateVertical(dt);return;}
  this.gear.step(dt);
  if(this.status!=='MANUAL'&&this.status!=='LANDING ABORTED'&&this.status!=='LANDED'&&this.gear.state==='STOWED')this.gear.transition('DEPLOYING');
  if(this.status!=='MANUAL'&&this.status!=='LANDING ABORTED'&&this.status!=='LANDED'){this.autoSeconds+=dt;if(this.autoSeconds>60&&!this.deadlineReason)this.deadlineReason=this.target?'Safe route requires more than 60 seconds':'No validated reachable site within 60 seconds';}
  if(['GROUND_CONTACT','COMPRESSING','SETTLED'].includes(this.gear.state)&&this.support?.contactVerified){if(this.gear.state==='SETTLED'){this.status='LANDED';this.phase='TOUCHDOWN COMPLETE';this.touchdownSeconds??=this.autoSeconds;}else{this.phase='VERIFIED CONTACT';return;}}
  if(this.status==='LANDED'){this.power=this.gear.state==='SETTLED'?0:Math.max(0,this.power-dt);return;}
  let forward=input.forward,lateral=input.lateral,vertical=input.vertical;
  if(this.status!=='MANUAL'&&this.status!=='LANDING ABORTED'){
   forward=0;lateral=0;vertical=0;
   if(!this.target){
    this.status='HOLDING_FOR_SAFE_SITE';this.phase='SEARCH';this.clearanceClimb=false;
    for(let k=0;k<3&&this.searchIndex<3200;k++){
     const i=this.searchIndex++,r=i===0?0:Math.sqrt(i)*9,a=i*2.399963,x=this.searchOrigin.x+Math.cos(a)*r,z=this.searchOrigin.z+Math.sin(a)*r;
     if(!this.clear(x,z))continue;const arrivalYaw=Math.hypot(x-this.x,z-this.z)>.12?targetYaw(x-this.x,z-this.z):this.yaw;const support=this.inspect(x,z,arrivalYaw);if(!support.valid)continue;const cruise=this.reachable(x,z);if(cruise===null)continue;
     const estimate=this.estimate(x,z,cruise,support);
     // Nearby sites are searched first. Reserve the independent landing budget.
     // Validated, reachable sites must not be rejected by ETA alone.
     this.target={x,z,support};this.cruise=cruise;this.routeEstimate=estimate;this.status='AUTO LANDING ENGAGED';break;
    }
    // Recover clearance vertically while searching; never force a fallback site.
    if(!this.target){this.phase=agl<=.05?'CLEARANCE RECOVERY':'HOLDING_FOR_SAFE_SITE';if(agl<=.05)this.status='AUTO LANDING ENGAGED';if(this.autoSeconds>=60||this.searchIndex>=3200){this.status='LANDING ABORTED';this.phase='NO VALIDATED REACHABLE SITE — MANUAL CONTROL / F TO RETRY';this.deadlineReason='No validated reachable landing site';this.vx=this.vy=this.vz=0;return;}}
    this.vx*=Math.exp(-4*dt);this.vz*=Math.exp(-4*dt);this.vy=Math.min(4,Math.max(0,(this.inspect(this.x,this.z).highest+10.65-this.y)*1.5));
   }
   if(this.target&&this.autoSeconds>=(this.routeCheckAt??0)){
    this.routeCheckAt=this.autoSeconds+2;
    const cruise=this.reachable(this.target.x,this.target.z);
    if(cruise===null){this.abortLanding('Route obstructed after scene update — F to retry');return;}
    this.cruise=Math.max(this.cruise,cruise);
   }
   if(this.target){
    const t=this.target,dx=t.x-this.x,dz=t.z-this.z,d=Math.hypot(dx,dz);
    const travel=d>.12;
    this.clearanceClimb=travel&&this.y<this.cruise-.3;
    this.phase=this.clearanceClimb?'CLEARANCE CLIMB':'ALIGN';
    if(travel)this.desiredYaw=targetYaw(dx,dz);
    const error=this.desiredYaw===null?0:angleDelta(this.desiredYaw,this.yaw);
    const desiredRate=Math.max(-.8,Math.min(.8,error*2.5));
    this.yawVelocity+=(desiredRate-this.yawVelocity)*(1-Math.exp(-6*dt));
    this.yaw+=this.yawVelocity*dt;
    const aligned=Math.abs(error)<.08&&Math.abs(this.yawVelocity)<.12;
    let targetY=travel||!aligned?this.cruise:t.support.highest+5.15;
    const ready=this.y>=this.cruise-.3||!travel;
    if(aligned&&!this.clearanceClimb)this.phase=travel?'TRANSLATE':'DESCEND';
    const nose=noseDirection(this.yaw),speed=ready&&aligned?Math.min(8,d*1.5):0;this.vx=nose.x*speed;this.vz=nose.z*speed;
    this.vy=Math.max(-2.5,Math.min(4,(targetY-this.y)*1.5));
    if(travel||!aligned)this.vy=Math.max(0,this.vy);
    if(!travel&&aligned){this.vx=0;this.vz=0;const current=this.inspect(this.x,this.z);this.support=current;targetY=current.highest+5.15;this.vy=Math.max(-2.5,Math.min(1,(targetY-this.y)*1.5));
     if(!current.valid){this.abortLanding('Arrival support failed revalidation');return;}
     if(this.gear.state==='LOCKED')this.gear.transition('DESCENDING');
     if(this.gear.state!=='DESCENDING')this.vy=Math.max(0,this.vy);
     if(Math.abs(this.y-targetY)<.005&&Math.abs(this.vy)<=.1&&this.gear.state==='DESCENDING'){
      if(this.completeContact(current))return;
     }
    }
   }
  }else{
   this.yawVelocity+=(input.yaw*.8-this.yawVelocity)*(1-Math.exp(-8*dt));this.yaw+=this.yawVelocity*dt;
   const n=Math.max(1,Math.hypot(forward,lateral)),c=Math.cos(this.yaw),s=Math.sin(this.yaw);
   this.vx+=(lateral/n*c-forward/n*s)*12*dt;this.vz+=(-forward/n*c-lateral/n*s)*12*dt;
   this.vx*=Math.exp(-1.2*dt);this.vz*=Math.exp(-1.2*dt);
   const speed=Math.hypot(this.vx,this.vz);if(speed>16){this.vx*=16/speed;this.vz*=16/speed;}
   this.vy=Math.max(-4,Math.min(6,(this.vy+vertical*9*dt)*Math.exp(-1.5*dt)));
  }
  const x=this.x+this.vx*dt,z=this.z+this.vz*dt;
  // Reject the attempted substep at the perimeter; no teleport or wraparound.
  if((x===this.x&&z===this.z)||(this.airClear(x,z,this.y)&&this.inspect(x,z).highest+5.15<=this.y+.001)){this.x=x;this.z=z;}else{this.vx=this.vz=0;if(this.target){this.target=null;this.routeCheckAt=0;this.status=agl<=.05?'AUTO LANDING ENGAGED':'HOLDING_FOR_SAFE_SITE';this.phase=agl<=.05?'CLEARANCE RECOVERY':'SEARCH';this.vy=Math.max(0,this.vy);}}
  if(this.autoSeconds>60&&this.status!=='MANUAL'&&this.status!=='LANDING ABORTED')this.status='LANDING_DELAYED_UNSAFE';
  const floor=this.inspect(this.x,this.z).highest+5.15;
  const nextY=Math.max(floor,this.y+this.vy*dt);
  const gearUnsafe=this.status==='MANUAL'&&this.gear.state!=='LOCKED'&&this.gear.state!=='DESCENDING'&&nextY-floor<5&&nextY<this.y;
  if(gearUnsafe)this.vy=0;
  else if(this.airClear(this.x,this.z,nextY,nextY>this.y))this.y=nextY;
  else this.vy=0;
  if(this.y<=floor&&this.vy<0)this.vy=0;
  if(this.status==='MANUAL'){
   this.activeSeconds+=dt;
   // Manual descent uses exactly the same support/contact gate as autopilot.
   if(['LOCKED','DESCENDING'].includes(this.gear.state)){
    const support=this.inspect(this.x,this.z);
    if(support.valid&&Math.abs(this.y-support.highest-5.15)<.005&&Math.hypot(this.vx,this.vz)<=.01&&Math.abs(this.vy)<=.1){
     if(this.gear.state==='LOCKED')this.gear.transition('DESCENDING');
     this.completeContact(support);
    }
   }
  }
 }
}

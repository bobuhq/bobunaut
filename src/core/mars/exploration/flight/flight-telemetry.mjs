import {headingDegrees} from '../genesis-v5/spacecraft-v3.mjs';
// Deployed pad underside: pad centre -5 m, half thickness .15 m.
// Same datum as FlightV2's support.highest + 5.15 target. Never zero by status.
export const LANDING_CLEARANCE_DATUM=5.15;
export function flightTelemetry(f){
 const terrain=f.inspect(f.x,f.z,f.yaw).highest;
 const bodyAltitude=f.y-terrain;
 const agl=bodyAltitude-LANDING_CLEARANCE_DATUM;
 const valid=Number.isFinite(agl);
 return {
  terrainProfile:Array.from({length:9},(_,i)=>{const d=(i+1)*5;return {distance:d,height:f.sample(f.x-Math.sin(f.yaw)*d,f.z-Math.cos(f.yaw)*d)};}),
  enginePower:Number.isFinite(f.power)?Math.round(f.power*100).toString():'—',
  agl:valid?agl:null,
  distance:valid?Math.max(0,agl).toFixed(1):'—',
  bodyAltitude:Number.isFinite(bodyAltitude)?bodyAltitude.toFixed(1):'—',
  bodyClearance:Number.isFinite(bodyAltitude)?(bodyAltitude-1.65).toFixed(1):'—',
  nearGround:valid&&agl<=15,
  landed:f.status==='LANDED',
  status:f.status==='LANDED'?'TOUCHDOWN COMPLETE':f.status,
  horizontal:Math.hypot(f.vx,f.vz).toFixed(1),vertical:f.vy.toFixed(1),
  heading:headingDegrees(f.yaw).toFixed(0),gear:f.gear.state,
  autopilot:(f.status==='MANUAL'||f.status==='LANDING ABORTED')?'STANDBY':f.status==='LANDED'?'COMPLETE':'ENGAGED',
  remaining:Math.max(0,60-f.activeSeconds).toFixed(1),
  autoRemaining:Math.max(0,60-f.autoSeconds).toFixed(1),phase:f.phase,
  localAGL:(f.y-f.sample(f.x,f.z)).toFixed(1),
  actualPadClearance:f.support?.contactVerified?Math.max(...f.support.padClearances.map(Math.abs)).toFixed(2):(bodyAltitude-5*f.gear.extension-.15).toFixed(2),
  timing:f.touchdownSeconds===null?(f.deadlineReason||''):`${f.touchdownSeconds.toFixed(1)} s / ${f.touchdownSeconds<=60?'ON TIME':'DELAYED'}`,
  deadlineReason:f.deadlineReason,
 };
}

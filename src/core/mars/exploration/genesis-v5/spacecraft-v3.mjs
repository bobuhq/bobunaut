// Hull half extents 5.4 x 5.9m. Four 2m pads at (+/-6,+/-6)
// reach sqrt(7²+7²)=9.90m. Retain the conservative V2 10m disc.
export const SPACECRAFT_RADIUS=10;
export const nextCameraMode=mode=>mode==='CHASE'?'COCKPIT':'CHASE';
export const cockpitLook=(x,y)=>({x:Math.max(-1.15,Math.min(1.15,x)),y:Math.max(-.55,Math.min(.55,y))});

// Three.js yaw rotates the mesh nose (0,0,-1) to (-sin(yaw),0,-cos(yaw)).
export const noseDirection=yaw=>({x:-Math.sin(yaw),z:-Math.cos(yaw)});
export const targetYaw=(dx,dz)=>Math.atan2(-dx,-dz);
export const angleDelta=(target,current)=>Math.atan2(Math.sin(target-current),Math.cos(target-current));
export const headingDegrees=yaw=>((-yaw*180/Math.PI)%360+360)%360;
export class MouseSteering {
 constructor(){this.active=false;this.alt=false;this.axis=0;this.look={x:0,y:0};}
 engage(){this.active=true;}
 release(){this.active=false;this.alt=false;this.axis=0;}
 move(dx,dy){if(!this.active)return;if(this.alt)this.look=cockpitLook(this.look.x-dx*.003,this.look.y-dy*.003);else this.axis=Math.max(-1,Math.min(1,this.axis-dx*.018));}
 step(dt){this.axis*=Math.exp(-7*dt);if(!this.alt){const k=Math.exp(-7*dt);this.look.x*=k;this.look.y*=k;}return this.active&&!this.alt?this.axis:0;}
}

// Only the renderer canvas can engage steering; overlay controls never bubble here.
export function bindMouseSteering(mouse,canvas,win,doc,switchCamera=()=>{}) {
 const stop=()=>{mouse.release();if(doc.pointerLockElement===canvas)doc.exitPointerLock();};
 const down=e=>{if(e.code==='KeyC'&&!e.repeat)switchCamera();if(e.key==='Alt'){mouse.alt=true;mouse.axis=0;}if(e.code==='Escape')stop();};
 const up=e=>{if(e.key==='Alt')mouse.alt=false;};
 const start=e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target!==canvas)return;mouse.engage();try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{/* Keep unlocked fallback active. */}};
 const move=e=>{if(doc.pointerLockElement===canvas||e.target===canvas)mouse.move(e.movementX,e.movementY);};
 const lock=()=>{if(doc.pointerLockElement!==canvas)mouse.release();};
 const visibility=()=>{if(doc.hidden)stop();};
 const bindings=[[win,'keydown',down],[win,'keyup',up],[win,'blur',stop],[doc,'visibilitychange',visibility],[doc,'pointerlockchange',lock],[canvas,'pointerdown',start],[doc,'pointermove',move]];
 for(const [el,event,fn] of bindings)el.addEventListener(event,fn);
 return()=>{stop();for(const [el,event,fn] of bindings)el.removeEventListener(event,fn);};
}

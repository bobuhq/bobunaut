import {LOWER_RINGS,AFT_RINGS,PILOT_EYE} from './spacecraft-v5-geometry.mjs';
/** Independently authored mesh topology. No imported model data or textures.
 * Metres, +Y up, nose -Z. The flight controller owns the unchanged radius-10 envelope.
 * Door bay is deliberately open on +X between z=-.95 and +.95.
 */
export const SPACECRAFT_CONTRACT=Object.freeze({
 renderer:'first-party-procedural-v1', collisionRadius:10,
 pilotEye:Object.freeze([...PILOT_EYE]),
 hatch:Object.freeze([3.22,-1.05,0]), stairs:Object.freeze([3.3,0,0]),
 exit:Object.freeze([7.4,-5,0]), gearMounts:Object.freeze([[-3.9,-1,-3.9],[3.9,-1,-3.9],[3.9,-1,3.9],[-3.9,-1,3.9]].map(Object.freeze)),
});
export function panelPositions(points){
 return [...points[0],...points[1],...points[2],...points[0],...points[2],...points[3]];
}
function interpolate(rings,z){
 const i=rings.findIndex(r=>r[0]>=z);if(i===0)return rings[0];
 const a=rings[i-1],b=rings[i],t=(z-a[0])/(b[0]-a[0]);return a.map((v,j)=>j===0?z:v+(b[j]-v)*t);
}
/** Same original shell sections, with a genuine aperture rather than a painted door. */
export function shellPositions(rings,{aft=false}={}){
 const zs=[...new Set([...rings.map(r=>r[0]),...[-.95,.95].filter(z=>z>rings[0][0]&&z<rings.at(-1)[0])])].sort((a,b)=>a-b);
 const sections=zs.map(z=>{const [,w,b,t]=interpolate(rings,z);return [[-w*.7,b,z],[-w,b+.5,z],[-w,t-.35,z],[-w*.68,t,z],[w*.68,t,z],[w,t-.35,z],[w,b+.5,z],[w*.7,b,z]];});
 const positions=[];
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<8;j++){
  if(zs[i]>=-.95&&zs[i+1]<=.95&&((j>=4&&j<=6)||(!aft&&j===3)||(aft&&j===7)))continue;
  const k=(j+1)%8;positions.push(...panelPositions([sections[i][j],sections[i+1][j],sections[i+1][k],sections[i][k]]));
 }
 for(const r of (aft?[sections.at(-1)]:[sections[0],sections.at(-1)]))for(let j=1;j<7;j++)positions.push(...r[0],...r[j],...r[j+1]);
 return positions;
}
export const HULL_SECTIONS={lower:LOWER_RINGS,aft:AFT_RINGS};

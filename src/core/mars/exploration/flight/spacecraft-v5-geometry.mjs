// Original ARES V6 refined shell (filename retained for V5 regression imports): metres, nose is local -Z. Shared by renderer and geometry regression.
export const LOWER_RINGS=[[-6.4,2.15,-.75,.1],[-5.4,2.9,-1.12,.12],[-3.6,3.7,-1.5,.15],[.6,4.05,-1.65,.15],[3.4,3.65,-1.42,.18],[5.3,2.8,-1.1,.2]];
export const AFT_RINGS=[[-.3,3.65,.1,2.7],[1.3,3.8,.05,2.72],[3.5,3.4,-.2,2.28],[5.2,2.7,-.5,1.5]];
export const CANOPY=[[-2.15,.15,-6.35],[2.15,.15,-6.35],[2.65,2.65,-3.8],[-2.65,2.65,-3.8]];
export const ROOF=[[-2.65,2.65,-3.8],[2.65,2.65,-3.8],[2.5,2.75,-.3],[-2.5,2.75,-.3]];
export const PILOT_EYE=[0,1.5,-2.4];
export function loftPositions(rings){
 const vertices=[];
 const ring=([z,w,bottom,top])=>[[-w*.7,bottom,z],[-w,bottom+.5,z],[-w,top-.35,z],[-w*.68,top,z],[w*.68,top,z],[w,top-.35,z],[w,bottom+.5,z],[w*.7,bottom,z]];
 const sections=rings.map(ring),tri=(a,b,c)=>vertices.push(...a,...b,...c);
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<8;j++){const k=(j+1)%8;tri(sections[i][j],sections[i+1][j],sections[i+1][k]);tri(sections[i][j],sections[i+1][k],sections[i][k]);}
 for(const r of [sections[0],sections[sections.length-1]])for(let j=1;j<7;j++)tri(r[0],r[j],r[j+1]);
 return vertices;
}

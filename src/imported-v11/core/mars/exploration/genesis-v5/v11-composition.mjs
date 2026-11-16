// Approved V11.1 local geometry; no placement authorization.
export const greenhouse={x:-48,z:12,width:19,depth:11};
// +Z is the front. Side dishes point inward and rear dish points forward.
export const towers=[
{id:'yellow',x:-64,z:5,color:'#ffd52a',period:31,amplitude:.26,phase:0,base:1.1631648213372698,pitch:-.07051804516214544},
{id:'red',x:-29,z:-17,color:'#ff203c',period:43,amplitude:.30,phase:0,base:.21608497229678644,pitch:-.12982669086678644},
{id:'green',x:34,z:2,color:'#20ff65',period:37,amplitude:.29,phase:0,base:-1.1839206090638685,pitch:-.033028097230554}];
export function scan(t,s){return {yaw:s.base+Math.sin(t*2*Math.PI/s.period+s.phase)*s.amplitude,pitch:s.pitch+Math.sin(t*2*Math.PI/(s.period*1.31))*.07};}
export const plaza={xMin:-59,xMax:28,zMin:14,zMax:65};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Same analytic surface drives visible paving vertices and preview floor sampling.
// Blend to actual terrain at all outer edges; no vertical platform lip.
export function courtyardHeight(surface,x,z,floor){
 if(x<plaza.xMin||x>plaza.xMax||z<13.2||z>65)return null;
 const ground=surface(x,z),edge=Math.min((x-plaza.xMin)/3,(plaza.xMax-x)/3,(65-z)/6);
 const hub=surface(-28,5)+.14;
 const hubZ=5,genesisZ=13.2;
 const cross=smooth((x+24)/18);
 const target=hub*(1-cross)+floor*cross;
 const start=hubZ*(1-cross)+genesisZ*cross;
 const t=Math.max(0,Math.min(1,(65-z)/(65-start))),a=.12;
 const approach=t<a?t*t/(2*a*(1-a)):t>1-a?1-(1-t)*(1-t)/(2*a*(1-a)):(t-a/2)/(1-a);
 const front=surface(x,65),graded=front+(target-front)*approach;
 return ground+(graded-ground)*smooth(Math.min((x-plaza.xMin)/3,(plaza.xMax-x)/3));
}

export function entryHeight(surface,x,z,floor){
 const base=courtyardHeight(surface,x,z,floor),dx=Math.abs(x+28);
 if(dx<3.2&&z>=4.4&&z<=25){
 const top=surface(-28,5)+.14,end=courtyardHeight(surface,x,25,floor)??surface(x,25);
 const ramp=z<5?top-.08*(5-z)/.6:top+(end-top)*(z-5)/20;
 if(dx<=1.8)return ramp;
 const blend=smooth((dx-1.8)/1.4);
 return ramp+((base??surface(x,z))-ramp)*blend;
 }
 return base;
}

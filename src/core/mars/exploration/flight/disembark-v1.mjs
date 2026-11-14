/** Pure and deterministic landing-to-walking sequence; no physics mutations. */
export const COCKPIT_END=2.6;
export const HATCH_END=5.2;
export const EXIT_DURATION=12.4;
export function disembarkPhase(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return 'FLIGHT';
 if(seconds<COCKPIT_END)return 'COCKPIT';
 if(seconds<HATCH_END)return 'HATCH';
 if(seconds<EXIT_DURATION)return 'STAIRS';
 return 'GROUND';
}
export function disembarkActorLocal(seconds){
 const t=Math.max(0,Math.min(1,(seconds-HATCH_END)/(EXIT_DURATION-HATCH_END)));
 return {x:3.25+4.15*t,y:-1.05-3.95*t,z:0};
}

/** Exit starts only after all four pads have verified contact and gear settlement. */
export function canDisembark(f){return f.status==='LANDED'&&f.gear.state==='SETTLED'&&f.support?.contactVerified===true;}

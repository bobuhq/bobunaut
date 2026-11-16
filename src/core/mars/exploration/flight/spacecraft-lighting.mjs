/** Visual settings only; independent of flight and landing controllers. */
export const UNDERGLOW = Object.freeze({
 color: '#65BEFF', intensity: 420, distance: 100,
 maxRadius: 12, groundOpacity: .28, engineOpacity: .24,
});
export const BEACON = Object.freeze({
 port: '#ff6875', starboard: '#78e8ff',
 period: 2, pulseDuration: .6, idle: .18, intensity: 2.4,
});
/** One smooth synchronized pulse every two seconds, with a readable idle marker. */
export function beaconLevel(time) {
 const phase = ((time % BEACON.period) + BEACON.period) % BEACON.period;
 const pulse = phase < BEACON.pulseDuration
  ? Math.sin(Math.PI * phase / BEACON.pulseDuration) ** 2 : 0;
 return BEACON.idle + (1 - BEACON.idle) * pulse;
}

/** Deliberate cinematic inverse footprint. AGL is pad datum above local terrain.
 * Lamp is 2.55m above pads: diameter grows from 3m aloft to 13m at rest.
 * Real spotlight only: no emissive terrain disc. Smooth and bounded at both ends.
 */
export function xenonBeam(agl, settled=false) {
 const height=Math.max(0,Number.isFinite(agl)?agl:100);
 const t=Math.max(0,Math.min(1,height/65));
 const smooth=t*t*(3-2*t);
 const radius=6.5-5*smooth;
 const lampHeight=height+2.55;
 const angle=Math.atan2(radius,lampHeight);
 // Maintain readable blue irradiance at distance, bounded to avoid white clipping.
 // Candela with inverse-square decay. Compensate broad near-ground cone:
 // cutoff must exceed the slant distance to its edge, not merely centre height.
 const intensity=Math.min(18000,lampHeight*lampHeight*7+radius*radius*5)*(settled?.9:1);
 return {radius,diameter:radius*2,angle,intensity,distance:Math.hypot(lampHeight,radius)*4};
}

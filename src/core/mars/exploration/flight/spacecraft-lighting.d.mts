/** One smooth synchronized pulse every two seconds, with a readable idle marker. */
export function beaconLevel(time: any): number;
/** Deliberate cinematic inverse footprint. AGL is pad datum above local terrain.
 * Lamp is 2.55m above pads: diameter grows from 3m aloft to 13m at rest.
 * Real spotlight only: no emissive terrain disc. Smooth and bounded at both ends.
 */
export function xenonBeam(agl: any, settled?: boolean): {
    radius: number;
    diameter: number;
    angle: number;
    intensity: number;
    distance: number;
};
/** Visual settings only; independent of flight and landing controllers. */
export const UNDERGLOW: Readonly<{
    color: "#65BEFF";
    intensity: 420;
    distance: 100;
    maxRadius: 12;
    groundOpacity: 0.28;
    engineOpacity: 0.24;
}>;
export const BEACON: Readonly<{
    port: "#ff6875";
    starboard: "#78e8ff";
    period: 2;
    pulseDuration: 0.6;
    idle: 0.18;
    intensity: 2.4;
}>;

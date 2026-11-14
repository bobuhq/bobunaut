export function disembarkPhase(seconds: any): "FLIGHT" | "COCKPIT" | "HATCH" | "STAIRS" | "GROUND";
export function disembarkActorLocal(seconds: any): {
    x: number;
    y: number;
    z: number;
};
/** Pure and deterministic landing-to-walking sequence; no physics mutations. */
export const COCKPIT_END: 2.6;
export const HATCH_END: 5.2;
export const EXIT_DURATION: 12.4;

export function canDisembark(f: any): boolean;

export function dustEnvelope(age: any): number;
/** Golden-angle distribution, no random emission or wrapping/recycling. */
export function dustPuff(index: any, age: any): {
    x: number;
    z: number;
    lift: number;
    scale: number;
};
/** Preview-only, single bounded burst. Rearm only after leaving the ground zone. */
export const DUST_DURATION: 5;
export class LandingDust {
    age: number;
    events: number;
    armed: boolean;
    x: number;
    z: number;
    yaw: number;
    step(dt: any, { height, descending, contact, x, z, yaw }: {
        height: any;
        descending: any;
        contact: any;
        x: any;
        z: any;
        yaw?: number;
    }): number;
}
export function thrusterDust(height: any, power: any, contact: any): number;

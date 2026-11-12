export const FLIGHT_ZONE: Readonly<{
    x: 110;
    z: -70;
    radius: 500;
}>;
export const VEHICLE_RADIUS: 10;
export const KEYMAP: Readonly<{
    KeyW: (string | number)[];
    KeyS: (string | number)[];
    KeyA: (string | number)[];
    KeyD: (string | number)[];
    KeyQ: (string | number)[];
    KeyE: (string | number)[];
    Space: (string | number)[];
    ShiftLeft: (string | number)[];
    ShiftRight: (string | number)[];
}>;
export function emptyInput(): {
    forward: number;
    lateral: number;
    yaw: number;
    vertical: number;
};
export class FlightV2 {
    constructor(sample: any, obstacles?: any[], bounds?: number);
    sample: any;
    obstacles: any[];
    landingAreas: readonly import("./green-landing-zone.mjs").LandingObstacle[];
    landingAnchor: {
        x: number;
        z: number;
    };
    assist: boolean;
    bounds: number;
    x: number;
    z: number;
    y: number;
    vx: number;
    vz: number;
    vy: number;
    yaw: number;
    yawVelocity: number;
    desiredYaw: number;
    activeSeconds: number;
    status: string;
    trigger: string;
    gear: LandingGear;
    target: {
        x: number;
        z: number;
        support: {
            valid: boolean;
            padHighest?: number[];
            padClearances?: number[];
            contactVerified?: boolean;
            highest: number;
            heights: any[];
            slopes: any[];
            relief: number;
            tilt: number;
            reason: string;
        };
    };
    searchIndex: number;
    lastNow: any;
    power: number;
    support: {
        valid: boolean;
            padHighest?: number[];
            padClearances?: number[];
            contactVerified?: boolean;
        highest: number;
        heights: any[];
        slopes: any[];
        relief: number;
        tilt: number;
        reason: string;
    };
    cruise: number;
    autoSeconds: number;
    touchdownSeconds: number;
    deadlineReason: string;
    phase: string;
    clearanceClimb: boolean;
    routeEstimate: number;
    lastBlocker: string;
    searchOrigin: {
        x: number;
        z: number;
    };
    inside(x: any, z: any): any;
    clear(x: any, z: any): boolean;
    /** Overflight is different from landing permission: ground reservations are not towers. */
    airClear(x: any, z: any, y: any, escapingProtectedGround?: boolean): boolean;
    inspect(x: any, z: any, yaw?: number): {
        valid: boolean;
            padHighest?: number[];
            padClearances?: number[];
            contactVerified?: boolean;
        highest: number;
        heights: any[];
        slopes: any[];
        relief: number;
        tilt: number;
        reason: string;
    };
    envelope(x: any, z: any): number;
    reachable(x: any, z: any): number;
    estimate(x: any, z: any, cruise: any, support: any): number;
    engage(reason: any): void;
    requestTouchdown(): void;
    beginVerticalLanding(reason?: string): void;
    assistHeight: number;
    assistVy: any;
    toggleGear(): void;
    abortLanding(reason: string): void;
    verifyContact(support: any): any;
    completeContact(support: any): boolean;
    integrateVertical(dt: any): void;
    pause(): void;
    step(now: any, input?: {
        forward: number;
        lateral: number;
        yaw: number;
        vertical: number;
    }, active?: boolean): void;
    integrate(dt: any, input: any): void;
}
import { LandingGear } from './landing-gear.mjs';

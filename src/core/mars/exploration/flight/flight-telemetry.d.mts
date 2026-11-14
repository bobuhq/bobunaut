export function flightTelemetry(f: any): {
    terrainProfile: {
        distance: number;
        height: any;
    }[];
    enginePower: string;
    agl: number;
    distance: string;
    bodyAltitude: string;
    bodyClearance: string;
    nearGround: boolean;
    landed: boolean;
    status: any;
    horizontal: string;
    vertical: any;
    heading: string;
    gear: any;
    autopilot: string;
    remaining: string;
    autoRemaining: string;
    phase: any;
    localAGL: string;
    actualPadClearance: string;
    timing: any;
    deadlineReason: any;
};
export const LANDING_CLEARANCE_DATUM: 5.15;

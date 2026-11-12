export function bindMouseSteering(mouse: any, canvas: any, win: any, doc: any, switchCamera?: () => void): () => void;
export const SPACECRAFT_RADIUS: 10;
export function nextCameraMode(mode: any): "COCKPIT" | "CHASE";
export function cockpitLook(x: any, y: any): {
    x: number;
    y: number;
};
export function noseDirection(yaw: any): {
    x: number;
    z: number;
};
export function targetYaw(dx: any, dz: any): number;
export function angleDelta(target: any, current: any): number;
export function headingDegrees(yaw: any): number;
export class MouseSteering {
    active: boolean;
    alt: boolean;
    axis: number;
    look: {
        x: number;
        y: number;
    };
    engage(): void;
    release(): void;
    move(dx: any, dy: any): void;
    step(dt: any): number;
}

import type { Object3D } from 'three';
export const RELAY_EMITTER: readonly [number, number, number];
export const RELAY_BORESIGHT: readonly [number, number, number];
export function animateRelay(azimuth: Object3D, elevation: Object3D, seconds: number): void;

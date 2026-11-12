export function updateInteriorMode(state: {elapsed: number; first: boolean}, inside: boolean, preferFirst: boolean, delta: number): boolean;
export function viewForward(yaw: number, pitch: number): [number,number,number];
export function applyLocalVisibility(target: {visible: boolean}, hidden: boolean, state: {original: boolean | null}): void;

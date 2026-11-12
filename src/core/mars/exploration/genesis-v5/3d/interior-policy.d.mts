export type Room = 'control' | 'corridor' | 'habitat' | 'exterior';
export const interiorOptions: { lights: boolean; roofTransparency: boolean; remoteDetails: boolean };
export const interiorMetrics: { room: Room; visibleRoomBatches: number; activeLights: number; shadowBatches: number };
export function roomAt(x: number, z: number): Room;
export function roomVisible(room: Room, viewer: Room, doors: {hub: number; habitat: number}): boolean;

export const lightingDiagnostics: { pointLights: boolean; indirectFill: boolean; roofEffects: boolean };

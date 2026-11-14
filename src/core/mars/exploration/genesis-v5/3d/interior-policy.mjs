// Closed portals are the only occluders. Shells/doors never participate.
export const interiorOptions = { lights: true, roofTransparency: true, remoteDetails: false };
export const interiorMetrics = { room: 'exterior', visibleRoomBatches: 0, activeLights: 0, shadowBatches: 0 };
export function roomAt(x, z) {
  if (Math.abs(x) <= 8.35 && z >= -9.1 && z <= 9.35) return 'control';
  if (Math.abs(x) <= 2.2 && z > -26.1 && z < -9.1) return 'corridor';
  if (Math.abs(x) <= 7.3 && z >= -43.2 && z <= -26.1) return 'habitat';
  return 'exterior';
}
export function roomVisible(room, viewer, doors) {
  if (viewer === 'exterior' || room === viewer) return true;
  // Retain details through the entire closing animation, including small gaps.
  if (room === 'control') return viewer === 'corridor' ? doors.hub > .001 : doors.hub > .001 && doors.habitat > .001;
  if (room === 'habitat') return viewer === 'corridor' ? doors.habitat > .001 : doors.hub > .001 && doors.habitat > .001;
  return viewer === 'control' ? doors.hub > .001 : doors.habitat > .001;
}

// Controlled by the offline preview only; defaults preserve approved behavior.
export const lightingDiagnostics = { pointLights: true, indirectFill: true, roofEffects: true };

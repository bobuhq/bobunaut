import { DataTexture, RGBAFormat, MeshStandardMaterial } from 'three';

// A constant baked diffuse irradiance map: one shared texel, no light loop,
// shadow pass or shader source mutation. Channel zero uses existing mesh UVs.
export const ROOM_FILL = Object.freeze({ control: .85, corridor: .72, habitat: 1.05 });
export function createInteriorFill() {
  const texture = new DataTexture(new Uint8Array([238, 246, 255, 255]), 1, 1, RGBAFormat);
  texture.channel = 0;
  texture.needsUpdate = true;
  const materials = new Map();
  return {
    register(material, room) {
      if (!(material instanceof MeshStandardMaterial) || !ROOM_FILL[room] || materials.has(material)) return;
      materials.set(material, { room, map: material.lightMap, intensity: material.lightMapIntensity });
      material.lightMap = texture;
      material.lightMapIntensity = 0;
      material.needsUpdate = true;
    },
    update(enabled, indoor, delta) {
      const blend = 1 - Math.exp(-8 * Math.min(delta, .05));
      for (const [material, { room }] of materials) {
        const target = enabled && indoor ? ROOM_FILL[room] : 0;
        // Zero immediately outdoors: never change exterior/day/night appearance.
        material.lightMapIntensity = target ? material.lightMapIntensity + (target - material.lightMapIntensity) * blend : 0;
      }
    },
    dispose() {
      for (const [material, previous] of materials) {
        material.lightMap = previous.map;
        material.lightMapIntensity = previous.intensity;
        material.needsUpdate = true;
      }
      materials.clear();
      texture.dispose();
    },
  };
}

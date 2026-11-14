/** Deterministic, presentation-only regolith detail anchored to the rendered terrain. */
export function createRegolithStones(sampleSurface, count = 210) {
  if (typeof sampleSurface !== "function" || !Number.isInteger(count) || count < 0 || count > 1000) {
    throw new TypeError("Invalid regolith scatter inputs");
  }
  const random = seed => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const stones = [];
  for (let i = 0; stones.length < count && i < count * 40 + 200; i++) {
    const x = (random(i + 11) - 0.5) * 198;
    const z = (random(i + 173) - 0.5) * 198;
    // Keep visual scatter clear of rooms, the reactor and the walkable apron.
    if (Math.abs(x) < 18 && z > -47 && z < 30) continue;
    if (Math.abs(x) < 3.8 && z > 10 && z < 29) continue;
    if (Math.hypot(x + 13, z + 1) < 4.8) continue;
    const ground = sampleSurface(x, z);
    if (!ground || ground.slopeDegrees > 27) continue;
    const size = 0.09 + random(i + 293) * 0.3;
    const scale = [size * (0.8 + random(i + 419) * 0.8), size * (0.28 + random(i + 557) * 0.4), size * (0.7 + random(i + 683) * 0.85)];
    stones.push({
      position: [x, ground.height + scale[1] * 0.9, z],
      scale,
      rotation: [random(i + 809) * 0.38, random(i + 907) * Math.PI * 2, random(i + 1013) * 0.38],
      color: i % 4,
    });
  }
  return stones;
}

/** Large decorative rocks stay outside buildings, reactor equipment and the approach lane. */
export function createBoulderField(sampleSurface, count = 42) {
  if (typeof sampleSurface !== "function" || !Number.isInteger(count) || count < 0 || count > 300) {
    throw new TypeError("Invalid boulder field inputs");
  }
  const random = seed => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const boulders = [];
  for (let i = 0; boulders.length < count && i < count * 60 + 400; i++) {
    const x = (random(i + 1) - 0.5) * 175, z = (random(i + 92) - 0.5) * 165;
    if (Math.abs(x) < 18 && z > -47 && z < 30) continue;
    if (Math.hypot(x + 13, z + 1) < 5.7) continue;
    const ground = sampleSurface(x, z);
    if (!ground || ground.slopeDegrees > 27) continue;
    const size = 0.35 + random(i + 212) * 1.5, scale = [size * (0.9 + random(i + 331)), size * 0.7, size];
    boulders.push({
      position: [x, ground.height + scale[1] * 0.88, z],
      scale,
      rotation: [random(i + 402) * 0.5, random(i + 503) * 6, random(i + 601) * 0.4],
      color: i % 3,
    });
  }
  return boulders;
}

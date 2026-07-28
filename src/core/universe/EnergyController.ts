import type { UniverseState } from "./UniverseState";

export function calculateUniverseEnergy(
  state: UniverseState,
  earnedGp: number,
): UniverseState {
  const energy = Math.max(0, Math.min(100, earnedGp * 4));

  return {
    ...state,
    energy,
    auraLevel: Math.floor(energy / 20),
    orbitSpeed: 1 + energy / 100,
    particleDensity: 0.35 + energy / 300,
  };
}

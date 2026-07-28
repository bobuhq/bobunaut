export type UniverseWeather =
  | "clear"
  | "nebula"
  | "meteor";

export interface UniverseState {
  energy: number;
  auraLevel: number;
  orbitSpeed: number;
  particleDensity: number;
  weather: UniverseWeather;

  isMining: boolean;

  claimAnimation: boolean;

  referralWave: boolean;
}

export const defaultUniverseState: UniverseState = {
  energy: 0,
  auraLevel: 0,
  orbitSpeed: 1,
  particleDensity: 0.35,
  weather: "clear",
  isMining: false,
  claimAnimation: false,
  referralWave: false,
};

export type UniverseThemeId =
  | "blue-galaxy"
  | "purple-nebula"
  | "emerald-sector"
  | "solar-storm"
  | "cosmic-celebration"
  | "deep-space"
  | "genesis-gold";

export type UniverseThemeSource =
  | "daily"
  | "event"
  | "season"
  | "manual";

export interface UniverseThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;

  backgroundStart: string;
  backgroundMiddle: string;
  backgroundEnd: string;

  nebulaPrimary: string;
  nebulaSecondary: string;

  meteorPrimary: string;
  meteorSecondary: string;
  meteorAccent: string;
}

export interface UniverseThemeEffects {
  meteorDensity: number;
  particleDensity: number;
  glowIntensity: number;
  celebrationIntensity: number;
  supernovaEnabled: boolean;
}

export interface UniverseTheme {
  id: UniverseThemeId;
  name: string;
  sectorName: string;
  description: string;
  palette: UniverseThemePalette;
  effects: UniverseThemeEffects;
}

export interface ActiveUniverseTheme {
  theme: UniverseTheme;
  source: UniverseThemeSource;
  resolvedAt: string;
}

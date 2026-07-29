import type {
  UniverseTheme,
  UniverseThemeId,
} from "./UniverseTheme";

export const universeThemes: Record<
  UniverseThemeId,
  UniverseTheme
> = {
  "blue-galaxy": {
    id: "blue-galaxy",
    name: "Blue Galaxy",
    sectorName: "Azure Horizon",
    description:
      "A calm blue sector filled with ice light and distant stellar signals.",
    palette: {
      primary: "#3ea6ff",
      secondary: "#6edcff",
      accent: "#a9f1ff",
      glow: "rgba(62, 166, 255, 0.72)",
      backgroundStart: "#040914",
      backgroundMiddle: "#07172a",
      backgroundEnd: "#030810",
      nebulaPrimary: "rgba(42, 126, 255, 0.30)",
      nebulaSecondary: "rgba(77, 225, 255, 0.18)",
      meteorPrimary: "#75ddff",
      meteorSecondary: "#3d8fff",
      meteorAccent: "#ffffff",
    },
    effects: {
      meteorDensity: 0.82,
      particleDensity: 0.72,
      glowIntensity: 0.78,
      celebrationIntensity: 0.25,
      supernovaEnabled: true,
    },
  },

  "purple-nebula": {
    id: "purple-nebula",
    name: "Purple Nebula",
    sectorName: "Violet Expanse",
    description:
      "A deep violet region shaped by luminous nebula clouds and Builder energy.",
    palette: {
      primary: "#7c4dff",
      secondary: "#b36cff",
      accent: "#e2c6ff",
      glow: "rgba(132, 77, 255, 0.76)",
      backgroundStart: "#090519",
      backgroundMiddle: "#150b31",
      backgroundEnd: "#050611",
      nebulaPrimary: "rgba(116, 57, 255, 0.34)",
      nebulaSecondary: "rgba(191, 92, 255, 0.20)",
      meteorPrimary: "#c68bff",
      meteorSecondary: "#704cff",
      meteorAccent: "#ffffff",
    },
    effects: {
      meteorDensity: 0.92,
      particleDensity: 0.82,
      glowIntensity: 0.9,
      celebrationIntensity: 0.34,
      supernovaEnabled: true,
    },
  },

  "emerald-sector": {
    id: "emerald-sector",
    name: "Emerald Sector",
    sectorName: "Verdant Signal",
    description:
      "An energized green sector illuminated by aurora currents and active signals.",
    palette: {
      primary: "#32e6a1",
      secondary: "#5fffd0",
      accent: "#c7ffea",
      glow: "rgba(46, 235, 166, 0.68)",
      backgroundStart: "#03110f",
      backgroundMiddle: "#06251d",
      backgroundEnd: "#030a0d",
      nebulaPrimary: "rgba(36, 220, 151, 0.25)",
      nebulaSecondary: "rgba(50, 184, 255, 0.15)",
      meteorPrimary: "#77ffd0",
      meteorSecondary: "#31d29b",
      meteorAccent: "#efffff",
    },
    effects: {
      meteorDensity: 0.86,
      particleDensity: 0.84,
      glowIntensity: 0.76,
      celebrationIntensity: 0.3,
      supernovaEnabled: true,
    },
  },

  "solar-storm": {
    id: "solar-storm",
    name: "Solar Storm",
    sectorName: "Helios Front",
    description:
      "A volatile orange sector charged by solar winds and golden stellar eruptions.",
    palette: {
      primary: "#ff8b32",
      secondary: "#ffc34f",
      accent: "#fff0bd",
      glow: "rgba(255, 132, 45, 0.72)",
      backgroundStart: "#160805",
      backgroundMiddle: "#2b1209",
      backgroundEnd: "#08070c",
      nebulaPrimary: "rgba(255, 103, 39, 0.29)",
      nebulaSecondary: "rgba(255, 196, 72, 0.18)",
      meteorPrimary: "#ffd173",
      meteorSecondary: "#ff7a2f",
      meteorAccent: "#ffffff",
    },
    effects: {
      meteorDensity: 1,
      particleDensity: 0.76,
      glowIntensity: 0.94,
      celebrationIntensity: 0.48,
      supernovaEnabled: true,
    },
  },

  "cosmic-celebration": {
    id: "cosmic-celebration",
    name: "Cosmic Celebration",
    sectorName: "Festival Orbit",
    description:
      "A high-energy celebration sector filled with colorful meteors and light bursts.",
    palette: {
      primary: "#a65cff",
      secondary: "#42dbff",
      accent: "#ffcf5c",
      glow: "rgba(170, 86, 255, 0.78)",
      backgroundStart: "#0b061b",
      backgroundMiddle: "#11183a",
      backgroundEnd: "#050812",
      nebulaPrimary: "rgba(171, 75, 255, 0.31)",
      nebulaSecondary: "rgba(39, 210, 255, 0.22)",
      meteorPrimary: "#64e7ff",
      meteorSecondary: "#be7cff",
      meteorAccent: "#ffd56d",
    },
    effects: {
      meteorDensity: 1.25,
      particleDensity: 1,
      glowIntensity: 1,
      celebrationIntensity: 1,
      supernovaEnabled: true,
    },
  },

  "deep-space": {
    id: "deep-space",
    name: "Deep Space",
    sectorName: "Silent Frontier",
    description:
      "A darker remote frontier where ancient stars and distant galaxies dominate.",
    palette: {
      primary: "#5868a9",
      secondary: "#7690d4",
      accent: "#ccd7ff",
      glow: "rgba(87, 105, 174, 0.56)",
      backgroundStart: "#02040a",
      backgroundMiddle: "#05091a",
      backgroundEnd: "#010309",
      nebulaPrimary: "rgba(66, 75, 145, 0.20)",
      nebulaSecondary: "rgba(51, 116, 157, 0.12)",
      meteorPrimary: "#9fb9ef",
      meteorSecondary: "#627bbf",
      meteorAccent: "#ffffff",
    },
    effects: {
      meteorDensity: 0.72,
      particleDensity: 1.08,
      glowIntensity: 0.55,
      celebrationIntensity: 0.12,
      supernovaEnabled: false,
    },
  },

  "genesis-gold": {
    id: "genesis-gold",
    name: "Genesis Gold",
    sectorName: "Genesis Core",
    description:
      "The premium golden origin sector honoring the first generation of Builders.",
    palette: {
      primary: "#dcae46",
      secondary: "#ffd86b",
      accent: "#fff3c2",
      glow: "rgba(255, 205, 91, 0.74)",
      backgroundStart: "#120d04",
      backgroundMiddle: "#211708",
      backgroundEnd: "#06060a",
      nebulaPrimary: "rgba(255, 184, 56, 0.24)",
      nebulaSecondary: "rgba(145, 79, 255, 0.17)",
      meteorPrimary: "#ffe18a",
      meteorSecondary: "#d99732",
      meteorAccent: "#ffffff",
    },
    effects: {
      meteorDensity: 0.94,
      particleDensity: 0.86,
      glowIntensity: 0.96,
      celebrationIntensity: 0.66,
      supernovaEnabled: true,
    },
  },
};

export function getUniverseTheme(
  themeId: UniverseThemeId,
): UniverseTheme {
  return universeThemes[themeId];
}

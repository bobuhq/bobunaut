export type GalaxyThemeName =
  | "violet"
  | "blue"
  | "cyan"
  | "green"
  | "lime"
  | "yellow"
  | "gold"
  | "orange"
  | "red"
  | "magenta";

export type GalaxyTheme = {
  name: GalaxyThemeName;
  glowColor: string;
  ringColor: string;
  lineColor: string;
  textAccent: string;
  nodeGradient: string;
  auraGradient: string;
};

export const galaxyThemes: Record<GalaxyThemeName, GalaxyTheme> = {
  violet: {
    name: "violet",
    glowColor: "#A855F7",
    ringColor: "rgba(168, 85, 247, 0.42)",
    lineColor: "rgba(168, 85, 247, 0.55)",
    textAccent: "#D8B4FE",
    nodeGradient:
      "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(91,33,182,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(168,85,247,0.34), rgba(168,85,247,0.04) 70%, transparent 100%)",
  },

  blue: {
    name: "blue",
    glowColor: "#3B82F6",
    ringColor: "rgba(59, 130, 246, 0.42)",
    lineColor: "rgba(59, 130, 246, 0.55)",
    textAccent: "#BFDBFE",
    nodeGradient:
      "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(29,78,216,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(59,130,246,0.30), rgba(59,130,246,0.04) 70%, transparent 100%)",
  },

  cyan: {
    name: "cyan",
    glowColor: "#22D3EE",
    ringColor: "rgba(34, 211, 238, 0.42)",
    lineColor: "rgba(34, 211, 238, 0.55)",
    textAccent: "#CFFAFE",
    nodeGradient:
      "linear-gradient(135deg, rgba(34,211,238,0.95), rgba(8,145,178,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(34,211,238,0.30), rgba(34,211,238,0.04) 70%, transparent 100%)",
  },

  green: {
    name: "green",
    glowColor: "#22C55E",
    ringColor: "rgba(34, 197, 94, 0.42)",
    lineColor: "rgba(34, 197, 94, 0.55)",
    textAccent: "#BBF7D0",
    nodeGradient:
      "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(21,128,61,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(34,197,94,0.30), rgba(34,197,94,0.04) 70%, transparent 100%)",
  },

  lime: {
    name: "lime",
    glowColor: "#84CC16",
    ringColor: "rgba(132, 204, 22, 0.42)",
    lineColor: "rgba(132, 204, 22, 0.55)",
    textAccent: "#D9F99D",
    nodeGradient:
      "linear-gradient(135deg, rgba(132,204,22,0.95), rgba(77,124,15,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(132,204,22,0.30), rgba(132,204,22,0.04) 70%, transparent 100%)",
  },

  yellow: {
    name: "yellow",
    glowColor: "#FACC15",
    ringColor: "rgba(250, 204, 21, 0.42)",
    lineColor: "rgba(250, 204, 21, 0.55)",
    textAccent: "#FEF08A",
    nodeGradient:
      "linear-gradient(135deg, rgba(250,204,21,0.95), rgba(202,138,4,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(250,204,21,0.30), rgba(250,204,21,0.04) 70%, transparent 100%)",
  },

  gold: {
    name: "gold",
    glowColor: "#F59E0B",
    ringColor: "rgba(245, 158, 11, 0.42)",
    lineColor: "rgba(245, 158, 11, 0.55)",
    textAccent: "#FDE68A",
    nodeGradient:
      "linear-gradient(135deg, rgba(245,158,11,0.98), rgba(180,83,9,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(245,158,11,0.34), rgba(245,158,11,0.04) 70%, transparent 100%)",
  },

  orange: {
    name: "orange",
    glowColor: "#F97316",
    ringColor: "rgba(249, 115, 22, 0.42)",
    lineColor: "rgba(249, 115, 22, 0.55)",
    textAccent: "#FED7AA",
    nodeGradient:
      "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(194,65,12,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(249,115,22,0.30), rgba(249,115,22,0.04) 70%, transparent 100%)",
  },

  red: {
    name: "red",
    glowColor: "#EF4444",
    ringColor: "rgba(239, 68, 68, 0.42)",
    lineColor: "rgba(239, 68, 68, 0.55)",
    textAccent: "#FECACA",
    nodeGradient:
      "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(239,68,68,0.30), rgba(239,68,68,0.04) 70%, transparent 100%)",
  },

  magenta: {
    name: "magenta",
    glowColor: "#EC4899",
    ringColor: "rgba(236, 72, 153, 0.42)",
    lineColor: "rgba(236, 72, 153, 0.55)",
    textAccent: "#FBCFE8",
    nodeGradient:
      "linear-gradient(135deg, rgba(236,72,153,0.95), rgba(190,24,93,0.92))",
    auraGradient:
      "radial-gradient(circle, rgba(236,72,153,0.30), rgba(236,72,153,0.04) 70%, transparent 100%)",
  },
};

export const galaxyPrimaryBranchThemes: GalaxyThemeName[] = [
  "blue",
  "green",
  "magenta",
  "cyan",
  "orange",
  "violet",
];

export const galaxySecondaryThemes: GalaxyThemeName[] = [
  "violet",
  "blue",
  "cyan",
  "green",
  "lime",
  "yellow",
  "gold",
  "orange",
  "red",
  "magenta",
];

export const getGalaxyTheme = (
  themeName: GalaxyThemeName,
): GalaxyTheme => galaxyThemes[themeName];

export const getPrimaryBranchTheme = (
  index: number,
): GalaxyTheme => {
  const name =
    galaxyPrimaryBranchThemes[
      index % galaxyPrimaryBranchThemes.length
    ];

  return galaxyThemes[name];
};

export const getSecondaryTheme = (
  index: number,
): GalaxyTheme => {
  const name =
    galaxySecondaryThemes[
      index % galaxySecondaryThemes.length
    ];

  return galaxyThemes[name];
};

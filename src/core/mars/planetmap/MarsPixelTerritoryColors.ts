export const MARS_PIXEL_TERRITORY_COLORS: Record<string, string> = {
  RAINBOW_01: "#FF1744",
  RAINBOW_02: "#FF3D00",
  RAINBOW_03: "#FF6D00",
  RAINBOW_04: "#FF9100",
  RAINBOW_05: "#FFD600",
  RAINBOW_06: "#EEFF00",
  RAINBOW_07: "#AEEA00",
  RAINBOW_08: "#64DD17",
  RAINBOW_09: "#00E676",
  RAINBOW_10: "#00E5A8",
  RAINBOW_11: "#00E5FF",
  RAINBOW_12: "#00B8FF",
  RAINBOW_13: "#2979FF",
  RAINBOW_14: "#304FFE",
  RAINBOW_15: "#651FFF",
  RAINBOW_16: "#8F00FF",
  RAINBOW_17: "#D500F9",
  RAINBOW_18: "#FF00D4",
  RAINBOW_19: "#FF1493",
  RAINBOW_20: "#FF4081",
};

export function marsPixelTerritoryColorRgb(
  colorKey: string | null | undefined,
): [number, number, number] | null {
  if (!colorKey) {
    return null;
  }

  const hex =
    MARS_PIXEL_TERRITORY_COLORS[colorKey];

  if (!hex) {
    return null;
  }

  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

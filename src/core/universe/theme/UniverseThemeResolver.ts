import type {
  ActiveUniverseTheme,
  UniverseThemeId,
  UniverseThemeSource,
} from "./UniverseTheme";
import { getUniverseTheme } from "./universeThemes";

const dailyThemeIds: Record<number, UniverseThemeId> = {
  0: "genesis-gold",
  1: "blue-galaxy",
  2: "purple-nebula",
  3: "emerald-sector",
  4: "solar-storm",
  5: "cosmic-celebration",
  6: "deep-space",
};

export interface UniverseThemeOverride {
  themeId: UniverseThemeId;
  source: Exclude<UniverseThemeSource, "daily">;
}

export function resolveDailyThemeId(
  date = new Date(),
): UniverseThemeId {
  return dailyThemeIds[date.getDay()];
}

export function resolveUniverseTheme(
  date = new Date(),
  override: UniverseThemeOverride | null = null,
): ActiveUniverseTheme {
  const themeId =
    override?.themeId ?? resolveDailyThemeId(date);

  return {
    theme: getUniverseTheme(themeId),
    source: override?.source ?? "daily",
    resolvedAt: date.toISOString(),
  };
}

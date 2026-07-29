import {
  useEffect,
  useState,
} from "react";
import type { ActiveUniverseTheme } from "./UniverseTheme";
import { universeThemeEngine } from "./UniverseThemeEngine";

export function useUniverseTheme(): ActiveUniverseTheme {
  const [activeTheme, setActiveTheme] =
    useState<ActiveUniverseTheme>(
      universeThemeEngine.getActiveTheme(),
    );

  useEffect(() => {
    universeThemeEngine.start();

    const unsubscribe =
      universeThemeEngine.subscribe(setActiveTheme);

    setActiveTheme(
      universeThemeEngine.getActiveTheme(),
    );

    return unsubscribe;
  }, []);

  return activeTheme;
}

import {
  type ReactNode,
  useEffect,
} from "react";
import { universeThemeEngine } from "./UniverseThemeEngine";

interface UniverseThemeProviderProps {
  children: ReactNode;
}

export function UniverseThemeProvider({
  children,
}: UniverseThemeProviderProps) {
  useEffect(() => {
    universeThemeEngine.start();

    return () => {
      universeThemeEngine.stop();
    };
  }, []);

  return children;
}

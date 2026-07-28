import { useEffect, useState } from "react";
import { universeEngine } from "./UniverseEngine";
import type { UniverseState } from "./UniverseState";

export function useUniverse(): UniverseState {
  const [state, setState] = useState(universeEngine.getState());

  useEffect(() => {
    universeEngine.start();

    const interval = window.setInterval(() => {
      setState(universeEngine.getState());
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return state;
}

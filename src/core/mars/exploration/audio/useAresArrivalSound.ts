import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { aresArrivalSound } from "./AresArrivalSound";
import { marsAudio } from "./MarsAudioEngine";

// Mounted above route-keyed content so surface remounts cannot create entries.
export function useAresArrivalRoute(pathname: string) {
  useLayoutEffect(() => { aresArrivalSound.routeChanged(pathname); }, [pathname]);
}

export function useAresArrivalSurface() {
  useEffect(aresArrivalSound.attachSurface, []);
}

export function useAresSoundControl() {
  const soundEnabled = useSyncExternalStore(aresArrivalSound.subscribe, aresArrivalSound.getEnabled, () => true);
  useEffect(() => { marsAudio.setEnabled(soundEnabled); }, [soundEnabled]);
  return {
    soundEnabled,
    toggleSound: () => {
      const next = !aresArrivalSound.getEnabled();
      aresArrivalSound.setEnabled(next);
      marsAudio.setEnabled(next);
      if (next) void marsAudio.unlock();
    },
  };
}

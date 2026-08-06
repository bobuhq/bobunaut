import { useSyncExternalStore } from "react";

import { preferencesStore } from "./PreferencesStore";

export function usePreferences() {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getSnapshot,
    preferencesStore.getSnapshot,
  );
}

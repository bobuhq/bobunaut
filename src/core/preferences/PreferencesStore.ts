import { LanguageService } from "../language/LanguageService";
import type {
  BuilderPreferences,
  BuilderPreferencesPatch,
  PreferencesStoreSnapshot,
} from "./types";

type PreferencesListener = () => void;

const createInitialPreferences =
  (): BuilderPreferences => ({
    preferredLanguage:
      LanguageService.resolveInitialLanguage(),
    themePreference: "system",
    motionPreference: "system",
    languageSetupCompleted: false,
    languageConfirmedAt: null,
  });

let snapshot: PreferencesStoreSnapshot = {
  preferences: createInitialPreferences(),
  source: "local",
  isRestoring: false,
  isSaving: false,
  lastError: null,
};

const listeners = new Set<PreferencesListener>();

const emitChange = (): void => {
  listeners.forEach((listener) => listener());
};

const replaceSnapshot = (
  nextSnapshot: PreferencesStoreSnapshot,
): void => {
  snapshot = nextSnapshot;
  emitChange();
};

export const preferencesStore = {
  getSnapshot(): PreferencesStoreSnapshot {
    return snapshot;
  },

  subscribe(
    listener: PreferencesListener,
  ): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  restore(
    preferences: BuilderPreferences,
  ): void {
    replaceSnapshot({
      preferences,
      source: "server",
      isRestoring: false,
      isSaving: false,
      lastError: null,
    });
  },

  updateLocal(
    patch: BuilderPreferencesPatch,
  ): void {
    const nextPreferences = {
      ...snapshot.preferences,
      ...patch,
    };

    if (patch.preferredLanguage) {
      LanguageService.storeLanguage(
        patch.preferredLanguage,
      );
    }

    replaceSnapshot({
      ...snapshot,
      preferences: nextPreferences,
      lastError: null,
    });
  },

  setRestoring(isRestoring: boolean): void {
    replaceSnapshot({
      ...snapshot,
      isRestoring,
      lastError: isRestoring
        ? null
        : snapshot.lastError,
    });
  },

  setSaving(isSaving: boolean): void {
    replaceSnapshot({
      ...snapshot,
      isSaving,
      lastError: isSaving
        ? null
        : snapshot.lastError,
    });
  },

  setError(error: unknown): void {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown preferences error";

    replaceSnapshot({
      ...snapshot,
      isRestoring: false,
      isSaving: false,
      lastError: message,
    });
  },

  reset(): void {
    replaceSnapshot({
      preferences: createInitialPreferences(),
      source: "local",
      isRestoring: false,
      isSaving: false,
      lastError: null,
    });
  },
};

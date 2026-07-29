import type { SupportedLanguage } from "../language/types";

export type ThemePreference =
  | "system"
  | "light"
  | "dark";

export type MotionPreference =
  | "system"
  | "full"
  | "reduced";

export interface BuilderPreferencesRow {
  builder_id: string;
  preferred_language: SupportedLanguage;
  theme_preference: ThemePreference;
  motion_preference: MotionPreference;
  created_at: string;
  updated_at: string;
}

export interface BuilderPreferences {
  preferredLanguage: SupportedLanguage;
  themePreference: ThemePreference;
  motionPreference: MotionPreference;
}

export type BuilderPreferencesPatch =
  Partial<BuilderPreferences>;

export type PreferencesSource =
  | "local"
  | "server";

export interface PreferencesStoreSnapshot {
  preferences: BuilderPreferences;
  source: PreferencesSource;
  isRestoring: boolean;
  isSaving: boolean;
  lastError: string | null;
}

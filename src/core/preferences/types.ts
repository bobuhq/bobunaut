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
  language_setup_completed: boolean;
  language_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuilderPreferences {
  preferredLanguage: SupportedLanguage;
  themePreference: ThemePreference;
  motionPreference: MotionPreference;
  languageSetupCompleted: boolean;
  languageConfirmedAt: string | null;
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

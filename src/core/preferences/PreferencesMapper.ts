import {
  supportedLanguages,
  type SupportedLanguage,
} from "../language";
import type {
  BuilderPreferences,
  BuilderPreferencesRow,
  MotionPreference,
  ThemePreference,
} from "./types";

const themePreferences: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

const motionPreferences: readonly MotionPreference[] = [
  "system",
  "full",
  "reduced",
];

const isSupportedLanguage = (
  value: string,
): value is SupportedLanguage =>
  supportedLanguages.includes(
    value as SupportedLanguage,
  );

const isThemePreference = (
  value: string,
): value is ThemePreference =>
  themePreferences.includes(
    value as ThemePreference,
  );

const isMotionPreference = (
  value: string,
): value is MotionPreference =>
  motionPreferences.includes(
    value as MotionPreference,
  );

export const preferencesMapper = {
  toPreferences(
    row: BuilderPreferencesRow,
    fallback: BuilderPreferences,
  ): BuilderPreferences {
    return {
      preferredLanguage: isSupportedLanguage(
        row.preferred_language,
      )
        ? row.preferred_language
        : fallback.preferredLanguage,

      themePreference: isThemePreference(
        row.theme_preference,
      )
        ? row.theme_preference
        : fallback.themePreference,

      motionPreference: isMotionPreference(
        row.motion_preference,
      )
        ? row.motion_preference
        : fallback.motionPreference,

      languageSetupCompleted:
        typeof row.language_setup_completed === "boolean"
          ? row.language_setup_completed
          : fallback.languageSetupCompleted,

      languageConfirmedAt:
        typeof row.language_confirmed_at === "string"
          ? row.language_confirmed_at
          : null,
    };
  },
};

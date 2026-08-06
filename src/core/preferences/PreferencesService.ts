import { LanguageService } from "../language";
import { preferencesMapper } from "./PreferencesMapper";
import { preferencesRepository } from "./PreferencesRepository";
import { preferencesStore } from "./PreferencesStore";
import type {
  BuilderPreferences,
  BuilderPreferencesPatch,
} from "./types";

const createFallbackPreferences =
  (): BuilderPreferences => ({
    preferredLanguage:
      LanguageService.resolveInitialLanguage(),
    themePreference: "system",
    motionPreference: "system",
    languageSetupCompleted: false,
    languageConfirmedAt: null,
  });

export const preferencesService = {
  async restore(
    builderId: string,
  ): Promise<BuilderPreferences> {
    preferencesStore.setRestoring(true);

    try {
      const row =
        await preferencesRepository.load(builderId);

      if (!row) {
        const fallback =
          createFallbackPreferences();

        preferencesStore.restore(fallback);

        return fallback;
      }

      const preferences =
        preferencesMapper.toPreferences(
          row,
          createFallbackPreferences(),
        );

      LanguageService.storeLanguage(
        preferences.preferredLanguage,
      );

      preferencesStore.restore(preferences);

      return preferences;
    } catch (error) {
      preferencesStore.setError(error);
      throw error;
    }
  },

  async update(
    patch: BuilderPreferencesPatch,
  ): Promise<BuilderPreferences> {
    const previousPreferences =
      preferencesStore.getSnapshot().preferences;

    preferencesStore.updateLocal(patch);
    preferencesStore.setSaving(true);

    try {
      const row =
        await preferencesRepository.updateMine(
          patch,
        );

      const preferences =
        preferencesMapper.toPreferences(
          row,
          previousPreferences,
        );

      LanguageService.storeLanguage(
        preferences.preferredLanguage,
      );

      preferencesStore.restore(preferences);

      return preferences;
    } catch (error) {
      preferencesStore.updateLocal(
        previousPreferences,
      );
      preferencesStore.setError(error);

      throw error;
    }
  },

  reset(): void {
    preferencesStore.reset();
  },
};

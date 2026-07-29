import { supabase } from "../../lib/supabase";
import type {
  BuilderPreferencesPatch,
  BuilderPreferencesRow,
} from "./types";

const preferencesColumns = `
  builder_id,
  preferred_language,
  theme_preference,
  motion_preference,
  created_at,
  updated_at
`;

export const preferencesRepository = {
  async load(
    builderId: string,
  ): Promise<BuilderPreferencesRow | null> {
    const { data, error } = await supabase
      .from("builder_preferences")
      .select(preferencesColumns)
      .eq("builder_id", builderId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Builder preferences could not be loaded: ${error.message}`,
      );
    }

    return data as BuilderPreferencesRow | null;
  },

  async updateMine(
    patch: BuilderPreferencesPatch,
  ): Promise<BuilderPreferencesRow> {
    const { data, error } = await supabase.rpc(
      "update_my_builder_preferences",
      {
        p_preferred_language:
          patch.preferredLanguage ?? null,
        p_theme_preference:
          patch.themePreference ?? null,
        p_motion_preference:
          patch.motionPreference ?? null,
      },
    );

    if (error) {
      throw new Error(
        `Builder preferences could not be saved: ${error.message}`,
      );
    }

    const normalizedData = Array.isArray(data)
      ? data[0]
      : data;

    if (!normalizedData) {
      throw new Error(
        "Builder preferences update returned no data.",
      );
    }

    return normalizedData as BuilderPreferencesRow;
  },
};

import { supabase } from "../../../lib/supabase";

import type {
  BuilderProfileRow,
  BuilderRepositoryResult,
  BuilderSocialIdentityRow,
} from "../types";

export const builderRepository = {
  async load(
    builderId: string,
  ): Promise<BuilderRepositoryResult> {
    if (builderId.trim().length === 0) {
      throw new Error("Builder ID is required.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("builder_profiles")
      .select("*")
      .eq("builder_id", builderId)
      .maybeSingle<BuilderProfileRow>();

    if (profileError) {
      throw profileError;
    }

    const {
      data: identities,
      error: identitiesError,
    } = await supabase
      .from("builder_social_identities")
      .select("*")
      .eq("builder_id", builderId)
      .returns<BuilderSocialIdentityRow[]>();

    if (identitiesError) {
      throw identitiesError;
    }

    return {
      builderId,
      profile,
      identities: identities ?? [],
    };
  },
};

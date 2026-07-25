/**
 * Raw builder profile returned by Supabase.
 *
 * This type represents the persistence model only.
 * Domain rules and UI-derived fields must not be added here.
 */
export interface BuilderProfileRow {
  builder_id: string;
  username: string | null;
  display_name: string | null;
  level: number;
  xp: number;
  gp: number;
  reputation: number;
  created_at: string;
  updated_at: string;
}

/**
 * Raw social identity returned by Supabase.
 *
 * Provider remains a string because the database currently accepts
 * arbitrary provider values. The mapper will explicitly normalize
 * supported providers before creating a Builder snapshot.
 */
export interface BuilderSocialIdentityRow {
  id: string;
  builder_id: string;
  provider: string;
  provider_user_id: string;
  username: string | null;
  verified: boolean;
  verified_at: string | null;
  reward_claimed: boolean;
  reward_claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Complete persistence result required to restore one Builder.
 *
 * A profile may not exist yet for a newly authenticated user.
 * Social identities therefore remain independently loadable.
 */
export interface BuilderRepositoryResult {
  profile: BuilderProfileRow | null;
  identities: BuilderSocialIdentityRow[];
}

import type { Builder } from "../models/Builder";

export interface RuleResult {
  passportUnlocked: boolean;
  gpEnabled: boolean;
  missionsUnlocked: boolean;
  galaxyUnlocked: boolean;
}

/**
 * Genesis Checkpoint requires only the three community tasks.
 * Wallet remains available in the model for a future release,
 * but it does not block Passport, GP or Missions.
 */
export const isIdentityComplete = (builder: Builder): boolean =>
  builder.identity.telegram &&
  builder.identity.x &&
  builder.identity.instagram;

export const evaluateBuilderRules = (builder: Builder): RuleResult => {
  const communityCheckpointComplete = isIdentityComplete(builder);

  const passportUnlocked = communityCheckpointComplete;
  const gpEnabled = communityCheckpointComplete;
  const missionsUnlocked = communityCheckpointComplete;

  const galaxyUnlocked =
    builder.level >= 5 || builder.referralCount >= 10;

  return {
    passportUnlocked,
    gpEnabled,
    missionsUnlocked,
    galaxyUnlocked,
  };
};

export const applyBuilderRules = (builder: Builder): Builder => {
  const result = evaluateBuilderRules(builder);

  return {
    ...builder,
    ...result,
  };
};

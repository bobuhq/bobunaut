import {
  createInitialBuilder,
  type Builder,
  type BuilderIdentity,
  type IdentityProvider,
} from "../../models/Builder";
import type { BuilderSnapshot } from "../snapshot/BuilderSnapshot";
import type {
  BuilderProfileRow,
  BuilderRepositoryResult,
  BuilderSocialIdentityRow,
} from "../types";

const toNonNegativeNumber = (
  value: number | string | null | undefined,
): number => {
  const normalized = Number(value ?? 0);

  if (
    !Number.isFinite(normalized) ||
    normalized < 0
  ) {
    return 0;
  }

  return normalized;
};

const supportedIdentityProviders: ReadonlySet<IdentityProvider> =
  new Set([
    "telegram",
    "x",
    "instagram",
    "wallet",
  ]);

const createEmptySnapshot = (
  builderId: string,
): BuilderSnapshot => {
  const initialBuilder: Builder = createInitialBuilder();

  return {
    ...initialBuilder,
    id: builderId,
  };
};

const mapIdentities = (
  identities: BuilderSocialIdentityRow[],
): BuilderIdentity => {
  const mapped: BuilderIdentity = {
    telegram: false,
    x: false,
    instagram: false,
    wallet: false,
  };

  identities.forEach((identity) => {
    const provider = identity.provider.toLowerCase();

    if (
      !supportedIdentityProviders.has(
        provider as IdentityProvider,
      )
    ) {
      return;
    }

    mapped[provider as IdentityProvider] =
      identity.verified;
  });

  return mapped;
};

const mapProfile = (
  profile: BuilderProfileRow,
  identities: BuilderSocialIdentityRow[],
): BuilderSnapshot => {
  const initialBuilder: Builder = createInitialBuilder();

  return {
    ...initialBuilder,
    id: profile.builder_id,
    username:
      profile.display_name ??
      profile.username ??
      initialBuilder.username,
    level: profile.level,
    personalGp: toNonNegativeNumber(
      profile.personal_gp,
    ),
    pendingNetworkGp: toNonNegativeNumber(
      profile.pending_network_gp,
    ),
    eligibleNetworkGp: toNonNegativeNumber(
      profile.eligible_network_gp,
    ),
    gp: toNonNegativeNumber(profile.gp),
    reputation: profile.reputation,
    inviteCode:
      profile.invite_code ??
      initialBuilder.inviteCode,
    referralCount: profile.referral_count,
    identity: mapIdentities(identities),
  };
};

export const builderMapper = {
  toSnapshot(
    source: BuilderRepositoryResult,
  ): BuilderSnapshot {
    if (source.profile === null) {
      return {
        ...createEmptySnapshot(source.builderId),
        identity: mapIdentities(source.identities),
      };
    }

    return mapProfile(
      source.profile,
      source.identities,
    );
  },
};

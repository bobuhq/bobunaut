export type IdentityProvider =
  | "telegram"
  | "x"
  | "instagram"
  | "wallet";

export interface BuilderIdentity {
  telegram: boolean;
  x: boolean;
  instagram: boolean;
  wallet: boolean;
}

export interface Builder {
  id: string;
  username: string;
  level: number;
  xp: number;

  /**
   * GP earned directly through the Builder's own activity.
   */
  personalGp: number;

  /**
   * Network GP that has not yet satisfied eligibility rules.
   * This balance does not count toward total GP.
   */
  pendingNetworkGp: number;

  /**
   * Eligible Network GP that counts toward total GP.
   */
  eligibleNetworkGp: number;

  /**
   * Authoritative total GP.
   *
   * gp = personalGp + eligibleNetworkGp
   */
  gp: number;

  reputation: number;

  /**
   * Unique Builder invitation code.
   * Used for future Builder Civilization network connections.
   */
  inviteCode: string;

  identity: BuilderIdentity;
  passportUnlocked: boolean;
  gpEnabled: boolean;
  missionsUnlocked: boolean;
  galaxyUnlocked: boolean;
  referralCount: number;
}

export const createInitialBuilder = (): Builder => ({
  id: "builder-001",
  username: "New Builder",
  level: 1,
  xp: 0,
  personalGp: 0,
  pendingNetworkGp: 0,
  eligibleNetworkGp: 0,
  gp: 0,
  reputation: 0,

  inviteCode: "BOBU-GENESIS",

  identity: {
    telegram: false,
    x: false,
    instagram: false,
    wallet: false,
  },
  passportUnlocked: false,
  gpEnabled: false,
  missionsUnlocked: false,
  galaxyUnlocked: false,
  referralCount: 0,
});

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
  gp: number;
  reputation: number;
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
  gp: 0,
  reputation: 0,
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

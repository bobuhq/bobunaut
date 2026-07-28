export type BuilderSystemStatus =
  | "active"
  | "synced"
  | "inactive"
  | "pending"
  | "locked";

export type BuilderStatusSnapshot = {
  builderId: string;
  username: string;
  level: number;
  gp: number;
  lifetimeEarnedGp: number;
  walletStatus: BuilderSystemStatus;
  genesisStatus: BuilderSystemStatus;
  miningStatus: BuilderSystemStatus;
};

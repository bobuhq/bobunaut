export type GPRewardSource =
  | "genesis"
  | "mission"
  | "achievement"
  | "mining"
  | "referral"
  | "event"
  | "admin";

export interface GPRewardRequest {
  builderId: string;

  amount: number;

  source: GPRewardSource;

  referenceId?: string;

  metadata?: Record<string, unknown>;
}

import type { GPRewardSource } from "../types/GPRewardRequest";

export interface GPTransaction {
  id: string;

  builderId: string;

  amount: number;

  source: GPRewardSource;

  createdAt: string;

  referenceId?: string;

  metadata?: Record<string, unknown>;
}

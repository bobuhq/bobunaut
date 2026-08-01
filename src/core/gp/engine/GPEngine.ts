import type {
  GenesisRewardProvider,
  GPRewardClaimResult,
} from "../services/GPRewardService";

import {
  gpRewardService,
} from "../services/GPRewardService";

import type {
  GPRewardRequest,
} from "../types/GPRewardRequest";

export class GPEngine {
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    console.info("[GPEngine] started");
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    console.info("[GPEngine] stopped");
  }

  async claimGenesisReward(
    provider: GenesisRewardProvider,
  ): Promise<GPRewardClaimResult> {
    if (!this.started) {
      throw new Error(
        "GP Engine must be started before claiming rewards.",
      );
    }

    return gpRewardService.claimGenesisReward(
      provider,
    );
  }

  /**
   * Reserved for future server-authoritative reward commands.
   * Browser clients must never determine trusted GP amounts.
   */
  reward(request: GPRewardRequest): void {
    console.info(
      "[GPEngine] reward command reserved",
      request.source,
      request.referenceId,
    );
  }

  deduct(): void {
    console.info(
      "[GPEngine] deduct is not active.",
    );
  }

  transfer(): void {
    console.info(
      "[GPEngine] transfer is not active.",
    );
  }

  getBalance(): number {
    return 0;
  }
}

export const gpEngine = new GPEngine();

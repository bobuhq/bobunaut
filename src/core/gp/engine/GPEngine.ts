import {
  builderMiningService,
  type BuilderMiningState,
} from "../../builder/services/BuilderMiningService";

import type {
  GenesisRewardProvider,
  AchievementGPRewardClaimResult,
  GPRewardClaimResult,
  MissionGPRewardClaimResult,
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

  async claimMissionReward(
    missionId: string,
    cycleKey: string,
  ): Promise<MissionGPRewardClaimResult> {
    if (!this.started) {
      throw new Error(
        "GP Engine must be started before claiming rewards.",
      );
    }

    return gpRewardService.claimMissionReward(
      missionId,
      cycleKey,
    );
  }

  async claimAchievementReward(
    achievementId: string,
  ): Promise<AchievementGPRewardClaimResult> {
    if (!this.started) {
      throw new Error(
        "GP Engine must be started before claiming rewards.",
      );
    }

    return gpRewardService.claimAchievementReward(
      achievementId,
    );
  }

  async claimMiningReward():
    Promise<BuilderMiningState> {
    if (!this.started) {
      throw new Error(
        "GP Engine must be started before claiming rewards.",
      );
    }

    return builderMiningService.claim();
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

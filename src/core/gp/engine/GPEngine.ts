import type { GPRewardRequest } from "../types/GPRewardRequest";

export class GPEngine {
  private started = false;

  start(): void {
    if (this.started) return;

    this.started = true;

    console.info("[GPEngine] started");
  }

  stop(): void {
    if (!this.started) return;

    this.started = false;

    console.info("[GPEngine] stopped");
  }

  reward(request: GPRewardRequest): void {
    console.info("[GPEngine] reward requested", request);
  }

  deduct(): void {
    console.info("[GPEngine] deduct");
  }

  transfer(): void {
    console.info("[GPEngine] transfer");
  }

  getBalance(): number {
    return 0;
  }
}

export const gpEngine = new GPEngine();

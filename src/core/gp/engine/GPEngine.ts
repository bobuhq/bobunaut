import type { GPRewardRequest } from "../types/GPRewardRequest";

export class GPEngine {
  reward(request: GPRewardRequest): void {
    console.info(
      "[GPEngine] reward requested",
      request,
    );
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

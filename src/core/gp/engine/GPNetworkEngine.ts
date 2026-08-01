import {
  gpNetworkRepository,
  type GPNetworkBalances,
} from "../repository/GPNetworkRepository";

export class GPNetworkEngine {
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    console.info("[GPNetworkEngine] started");
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    console.info("[GPNetworkEngine] stopped");
  }

  async getBalances():
    Promise<GPNetworkBalances> {
    if (!this.started) {
      throw new Error(
        "GP Network Engine must be started before loading balances.",
      );
    }

    return gpNetworkRepository.loadMine();
  }
}

export const gpNetworkEngine =
  new GPNetworkEngine();

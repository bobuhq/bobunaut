import { gameEngine } from "../game";

export class CoreEngine {
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    gameEngine.start();
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    gameEngine.stop();

    this.started = false;
  }
}

export const coreEngine = new CoreEngine();
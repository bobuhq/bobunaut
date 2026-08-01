import { gameEngine } from "../game";
import {
  gpEngine,
  gpNetworkEngine,
} from "../gp";

export class CoreEngine {
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    gpEngine.start();
    gpNetworkEngine.start();
    gameEngine.start();
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    gameEngine.stop();
    gpNetworkEngine.stop();
    gpEngine.stop();

    this.started = false;
  }
}

export const coreEngine = new CoreEngine();

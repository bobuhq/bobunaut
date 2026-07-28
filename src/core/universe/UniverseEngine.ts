import { eventEngine } from "../engine/eventEngine";
import {
  defaultUniverseState,
  type UniverseState,
} from "./UniverseState";
import { calculateUniverseEnergy } from "./EnergyController";

export class UniverseEngine {
  private state: UniverseState = { ...defaultUniverseState };

  private started = false;

  start(): void {
    if (this.started) return;

    this.started = true;

    eventEngine.subscribe((event) => {
      switch (event.type) {
        case "XP_EARNED":
          this.state = calculateUniverseEnergy(
            this.state,
            event.amount
          );
          break;

        default:
          break;
      }
    });
  }

  stop(): void {
    this.started = false;
  }

  getState(): UniverseState {
    return this.state;
  }

  reset(): void {
    this.state = { ...defaultUniverseState };
  }
}

export const universeEngine = new UniverseEngine();

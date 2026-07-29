import type { GameEvent } from "../events";
import { missionEngine } from "./MissionEngine";

export class GameEngine {
  async dispatch(event: GameEvent): Promise<void> {
    await missionEngine.handle(event);
  }
}

export const gameEngine = new GameEngine();

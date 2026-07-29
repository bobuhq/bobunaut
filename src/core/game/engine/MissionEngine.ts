import type { GameEvent } from "../events";
import { missionService } from "../services/MissionService";

export class MissionEngine {
  async handle(event: GameEvent): Promise<void> {
    missionService.handle(event);
  }
}

export const missionEngine =
  new MissionEngine();

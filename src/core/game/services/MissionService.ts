import type {
  GameEvent,
} from "../events";

import {
  missionRepository,
} from "../repository/MissionRepository";

export class MissionService {
  handle(event: GameEvent): void {
    const missions =
      missionRepository.getDefinitions();

    for (const mission of missions) {
      if (mission.eventType !== event.type) {
        continue;
      }

      console.info(
        "[Mission Completed]",
        mission.title,
      );
    }
  }
}

export const missionService =
  new MissionService();
